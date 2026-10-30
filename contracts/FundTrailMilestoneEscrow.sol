// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundTrailMilestoneEscrow
 * @notice Transparent Milestone-Based Escrow Smart Contract for Charity Projects.
 * @dev Deployed on Polygon Amoy Testnet (Chain ID 80002).
 * Handles testnet POL contributions, IPFS evidence tracking with SHA-256 fingerprints,
 * independent verifier authorization, and conditional fund releases to NGO wallets.
 *
 * IMPORTANT: This contract manages TESTNET demonstration funds (POL) only.
 */
contract FundTrailMilestoneEscrow is ReentrancyGuard {
    enum ProjectStatus {
        ACTIVE,
        COMPLETED,
        PAUSED
    }

    enum MilestoneStatus {
        PENDING,
        SUBMITTED,
        APPROVED,
        REJECTED,
        RELEASED
    }

    struct Milestone {
        string title;
        uint256 allocatedAmount;
        uint256 releasedAmount;
        MilestoneStatus status;
        string ipfsCid;
        bytes32 evidenceHash;
        uint256 submittedAt;
        uint256 reviewedAt;
        string reviewReason;
    }

    struct Project {
        bytes32 projectId;
        address payable ngoWallet;
        address authorizedVerifier;
        uint256 targetAmount;
        uint256 totalReceived;
        uint256 totalReleased;
        ProjectStatus status;
        uint256 createdAt;
        bool exists;
    }

    // Storage
    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => Milestone[]) private _projectMilestones;
    mapping(bytes32 => mapping(address => uint256)) public donorContributions;

    // List of all project IDs
    bytes32[] public projectIds;

    // Events
    event ProjectCreated(
        bytes32 indexed projectId,
        address indexed ngoWallet,
        address indexed authorizedVerifier,
        uint256 targetAmount,
        uint256 milestoneCount
    );

    event MilestoneCreated(
        bytes32 indexed projectId,
        uint256 indexed milestoneIndex,
        string title,
        uint256 allocatedAmount
    );

    event DonationReceived(
        bytes32 indexed projectId,
        address indexed donor,
        uint256 amount,
        uint256 totalProjectReceived
    );

    event MilestoneEvidenceSubmitted(
        bytes32 indexed projectId,
        uint256 indexed milestoneIndex,
        string ipfsCid,
        bytes32 evidenceHash,
        uint256 submittedAt
    );

    event MilestoneVerified(
        bytes32 indexed projectId,
        uint256 indexed milestoneIndex,
        bool approved,
        string reviewReason,
        address indexed verifier,
        uint256 reviewedAt
    );

    event FundsReleased(
        bytes32 indexed projectId,
        uint256 indexed milestoneIndex,
        address indexed recipient,
        uint256 amountReleased,
        uint256 totalProjectReleased
    );

    // Modifiers
    modifier projectExists(bytes32 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        _;
    }

    modifier onlyNGO(bytes32 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        require(msg.sender == projects[projectId].ngoWallet, "Caller is not the registered NGO wallet");
        _;
    }

    modifier onlyVerifier(bytes32 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        require(msg.sender == projects[projectId].authorizedVerifier, "Caller is not the authorized verifier");
        require(msg.sender != projects[projectId].ngoWallet, "NGO cannot act as its own verifier");
        _;
    }

    constructor() {}

    /**
     * @notice Create an on-chain project with predefined milestone allocations
     * @param projectId Unique Keccak256 hash or identifier of the project
     * @param ngoWallet Registered wallet address of the NGO recipient
     * @param authorizedVerifier Authorized independent verifier wallet address
     * @param targetAmount Total funding target in wei (testnet POL)
     * @param milestoneTitles Array of milestone names
     * @param milestoneAllocations Array of allocation amounts corresponding to each milestone
     */
    function createProject(
        bytes32 projectId,
        address payable ngoWallet,
        address authorizedVerifier,
        uint256 targetAmount,
        string[] calldata milestoneTitles,
        uint256[] calldata milestoneAllocations
    ) external {
        require(projectId != bytes32(0), "Invalid project ID");
        require(!projects[projectId].exists, "Project ID already exists");
        require(ngoWallet != address(0), "Invalid NGO wallet address");
        require(authorizedVerifier != address(0), "Invalid verifier address");
        require(ngoWallet != authorizedVerifier, "NGO and Verifier cannot be identical");
        require(targetAmount > 0, "Target amount must be greater than zero");
        require(milestoneTitles.length > 0, "At least one milestone is required");
        require(
            milestoneTitles.length == milestoneAllocations.length,
            "Titles and allocations count mismatch"
        );

        uint256 sumAllocations = 0;
        for (uint256 i = 0; i < milestoneAllocations.length; i++) {
            require(milestoneAllocations[i] > 0, "Milestone allocation must be greater than zero");
            sumAllocations += milestoneAllocations[i];
        }
        require(sumAllocations == targetAmount, "Sum of milestone allocations must equal target amount");

        projects[projectId] = Project({
            projectId: projectId,
            ngoWallet: ngoWallet,
            authorizedVerifier: authorizedVerifier,
            targetAmount: targetAmount,
            totalReceived: 0,
            totalReleased: 0,
            status: ProjectStatus.ACTIVE,
            createdAt: block.timestamp,
            exists: true
        });

        projectIds.push(projectId);

        for (uint256 i = 0; i < milestoneTitles.length; i++) {
            _projectMilestones[projectId].push(
                Milestone({
                    title: milestoneTitles[i],
                    allocatedAmount: milestoneAllocations[i],
                    releasedAmount: 0,
                    status: MilestoneStatus.PENDING,
                    ipfsCid: "",
                    evidenceHash: bytes32(0),
                    submittedAt: 0,
                    reviewedAt: 0,
                    reviewReason: ""
                })
            );

            emit MilestoneCreated(projectId, i, milestoneTitles[i], milestoneAllocations[i]);
        }

        emit ProjectCreated(
            projectId,
            ngoWallet,
            authorizedVerifier,
            targetAmount,
            milestoneTitles.length
        );
    }

    /**
     * @notice Contribute testnet POL to a project escrow
     * @param projectId Unique identifier of the target project
     */
    function contribute(bytes32 projectId) external payable projectExists(projectId) {
        require(msg.value > 0, "Contribution must be greater than zero");
        Project storage project = projects[projectId];
        require(project.status == ProjectStatus.ACTIVE, "Project is not currently active");

        project.totalReceived += msg.value;
        donorContributions[projectId][msg.sender] += msg.value;

        emit DonationReceived(projectId, msg.sender, msg.value, project.totalReceived);
    }

    /**
     * @notice NGO submits IPFS evidence and canonical SHA-256 fingerprint for a milestone
     * @param projectId Project identifier
     * @param milestoneIndex Zero-based index of the milestone
     * @param ipfsCid IPFS CID of public supporting documentation
     * @param evidenceHash SHA-256 cryptographic fingerprint of the evidence manifest
     */
    function submitMilestoneEvidence(
        bytes32 projectId,
        uint256 milestoneIndex,
        string calldata ipfsCid,
        bytes32 evidenceHash
    ) external onlyNGO(projectId) {
        Milestone[] storage milestones = _projectMilestones[projectId];
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];

        require(
            milestone.status == MilestoneStatus.PENDING || milestone.status == MilestoneStatus.REJECTED,
            "Milestone is not in PENDING or REJECTED state"
        );
        require(bytes(ipfsCid).length > 0, "IPFS CID cannot be empty");
        require(evidenceHash != bytes32(0), "Evidence fingerprint cannot be zero");

        milestone.ipfsCid = ipfsCid;
        milestone.evidenceHash = evidenceHash;
        milestone.submittedAt = block.timestamp;
        milestone.status = MilestoneStatus.SUBMITTED;

        emit MilestoneEvidenceSubmitted(
            projectId,
            milestoneIndex,
            ipfsCid,
            evidenceHash,
            block.timestamp
        );
    }

    /**
     * @notice Authorized independent verifier reviews evidence and approves or rejects milestone
     * @param projectId Project identifier
     * @param milestoneIndex Zero-based index of the milestone
     * @param approved True to approve milestone, false to reject
     * @param reviewReason Reason or verification notes
     */
    function verifyMilestone(
        bytes32 projectId,
        uint256 milestoneIndex,
        bool approved,
        string calldata reviewReason
    ) external onlyVerifier(projectId) {
        Milestone[] storage milestones = _projectMilestones[projectId];
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];

        require(milestone.status == MilestoneStatus.SUBMITTED, "Milestone is not in SUBMITTED state");
        require(bytes(reviewReason).length > 0, "Review reason must be provided");

        milestone.reviewedAt = block.timestamp;
        milestone.reviewReason = reviewReason;

        if (approved) {
            milestone.status = MilestoneStatus.APPROVED;
        } else {
            milestone.status = MilestoneStatus.REJECTED;
        }

        emit MilestoneVerified(
            projectId,
            milestoneIndex,
            approved,
            reviewReason,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Release funds for an approved milestone to the registered NGO wallet
     * @param projectId Project identifier
     * @param milestoneIndex Zero-based index of the milestone
     */
    function releaseMilestoneFunds(bytes32 projectId, uint256 milestoneIndex)
        external
        nonReentrant
        projectExists(projectId)
    {
        Project storage project = projects[projectId];
        Milestone[] storage milestones = _projectMilestones[projectId];
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];

        require(milestone.status == MilestoneStatus.APPROVED, "Milestone must be APPROVED before release");
        require(milestone.releasedAmount == 0, "Milestone funds already released");

        uint256 escrowAvailable = project.totalReceived - project.totalReleased;
        require(
            escrowAvailable >= milestone.allocatedAmount,
            "Insufficient project escrow balance to release milestone"
        );

        // Checks-Effects
        uint256 releaseAmt = milestone.allocatedAmount;
        milestone.status = MilestoneStatus.RELEASED;
        milestone.releasedAmount = releaseAmt;
        project.totalReleased += releaseAmt;

        // Check if all milestones released
        bool allCompleted = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.RELEASED) {
                allCompleted = false;
                break;
            }
        }
        if (allCompleted) {
            project.status = ProjectStatus.COMPLETED;
        }

        // Interaction
        (bool success, ) = project.ngoWallet.call{value: releaseAmt}("");
        require(success, "POL transfer to NGO wallet failed");

        emit FundsReleased(
            projectId,
            milestoneIndex,
            project.ngoWallet,
            releaseAmt,
            project.totalReleased
        );
    }

    // --- View Helpers ---

    function getProject(bytes32 projectId)
        external
        view
        projectExists(projectId)
        returns (Project memory)
    {
        return projects[projectId];
    }

    function getMilestone(bytes32 projectId, uint256 milestoneIndex)
        external
        view
        projectExists(projectId)
        returns (Milestone memory)
    {
        require(milestoneIndex < _projectMilestones[projectId].length, "Invalid milestone index");
        return _projectMilestones[projectId][milestoneIndex];
    }

    function getMilestonesCount(bytes32 projectId)
        external
        view
        projectExists(projectId)
        returns (uint256)
    {
        return _projectMilestones[projectId].length;
    }

    function getEscrowBalance(bytes32 projectId)
        external
        view
        projectExists(projectId)
        returns (uint256)
    {
        Project storage p = projects[projectId];
        return p.totalReceived - p.totalReleased;
    }

    function getProjectIds() external view returns (bytes32[] memory) {
        return projectIds;
    }
}
