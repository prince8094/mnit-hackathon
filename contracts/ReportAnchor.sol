// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReportAnchor
 * @notice FundTrail smart contract to record tamper-evident cryptographic fingerprints
 * of published NGO project utilisation reports on Polygon Amoy.
 * @dev Does not handle funds, custody, or personal donor data. Only stores cryptographic hashes.
 */
contract ReportAnchor {
    address public owner;

    // Mapping of authorized NGO publisher wallet addresses
    mapping(address => bool) public isAuthorizedPublisher;

    // projectKey => (version => reportHash (SHA-256 / bytes32))
    mapping(bytes32 => mapping(uint64 => bytes32)) public reportHashes;

    // projectKey => highest anchored version so far
    mapping(bytes32 => uint64) public latestVersion;

    // projectKey => version => publisher address
    mapping(bytes32 => mapping(uint64 => address)) public reportPublishers;

    // projectKey => version => timestamp
    mapping(bytes32 => mapping(uint64 => uint256)) public reportTimestamps;

    // Events
    event PublisherStatusChanged(address indexed publisher, bool allowed);
    event ReportAnchored(
        bytes32 indexed projectKey,
        uint64 indexed version,
        bytes32 reportHash,
        address indexed publisher
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorizedPublisher() {
        require(isAuthorizedPublisher[msg.sender], "Not an authorized NGO publisher");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAuthorizedPublisher[msg.sender] = true;
        emit PublisherStatusChanged(msg.sender, true);
    }

    /**
     * @notice Authorize or revoke an NGO wallet to anchor reports
     * @param publisher The wallet address
     * @param allowed True to grant authorization, false to revoke
     */
    function setPublisher(address publisher, bool allowed) external onlyOwner {
        require(publisher != address(0), "Invalid publisher address");
        isAuthorizedPublisher[publisher] = allowed;
        emit PublisherStatusChanged(publisher, allowed);
    }

    /**
     * @notice Anchor a cryptographic fingerprint of a published project report
     * @param projectKey Keccak256 hash of stable project UUID
     * @param reportHash SHA-256 hash of canonicalized JSON report snapshot
     * @param version Strictly increasing positive version number
     */
    function anchorReport(
        bytes32 projectKey,
        bytes32 reportHash,
        uint64 version
    ) external onlyAuthorizedPublisher {
        require(projectKey != bytes32(0), "Invalid project key");
        require(reportHash != bytes32(0), "Invalid report hash");
        require(version > 0, "Version must be greater than 0");
        require(version > latestVersion[projectKey], "Version must be strictly increasing");
        require(reportHashes[projectKey][version] == bytes32(0), "Version already anchored");

        reportHashes[projectKey][version] = reportHash;
        latestVersion[projectKey] = version;
        reportPublishers[projectKey][version] = msg.sender;
        reportTimestamps[projectKey][version] = block.timestamp;

        emit ReportAnchored(projectKey, version, reportHash, msg.sender);
    }

    /**
     * @notice Retrieve the stored report hash for a given project key and version
     * @param projectKey Keccak256 hash of project UUID
     * @param version Version number
     * @return The 32-byte report hash
     */
    function getReportHash(bytes32 projectKey, uint64 version) external view returns (bytes32) {
        return reportHashes[projectKey][version];
    }

    /**
     * @notice Retrieve full anchor metadata for verification
     * @param projectKey Keccak256 hash of project UUID
     * @param version Version number
     */
    function getAnchorDetails(bytes32 projectKey, uint64 version) external view returns (
        bytes32 reportHash,
        address publisher,
        uint256 timestamp
    ) {
        return (
            reportHashes[projectKey][version],
            reportPublishers[projectKey][version],
            reportTimestamps[projectKey][version]
        );
    }
}

