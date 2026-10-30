export const REPORT_ANCHOR_ABI = [
  "constructor()",
  "event PublisherStatusChanged(address indexed publisher, bool allowed)",
  "event ReportAnchored(bytes32 indexed projectKey, uint64 indexed version, bytes32 reportHash, address indexed publisher)",
  "function anchorReport(bytes32 projectKey, bytes32 reportHash, uint64 version) external",
  "function getReportHash(bytes32 projectKey, uint64 version) external view returns (bytes32)",
  "function getAnchorDetails(bytes32 projectKey, uint64 version) external view returns (bytes32 reportHash, address publisher, uint256 timestamp)",
  "function isAuthorizedPublisher(address) external view returns (bool)",
  "function latestVersion(bytes32) external view returns (uint64)",
  "function owner() external view returns (address)",
  "function setPublisher(address publisher, bool allowed) external"
];

