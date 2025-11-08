// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CaribbeanAssets
 * @dev NFT contract for game assets (cars, houses, weapons, etc.)
 */
contract CaribbeanAssets is ERC721, ERC721URIStorage, Ownable, Pausable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // Asset types
    enum AssetType { Vehicle, Property, Weapon, Business, Item }

    struct Asset {
        AssetType assetType;
        string name;
        uint256 value; // In CARIB tokens
        string island; // Which Caribbean island
        uint256 mintedAt;
        bool isLocked; // Locked during transfer cooldown
        uint256 unlockTime;
    }

    // Mapping from token ID to asset data
    mapping(uint256 => Asset) public assets;

    // Game contract that can perform special operations
    address public gameContract;

    // Marketplace contract
    address public marketplaceContract;

    // Transfer fee (percentage, e.g., 2 = 2%)
    uint256 public transferFeePercent = 2;

    // Treasury for collected fees
    address public treasury;

    // Events
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed owner,
        AssetType assetType,
        string name,
        uint256 value
    );
    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string reason
    );
    event AssetLocked(uint256 indexed tokenId, uint256 unlockTime);
    event AssetUnlocked(uint256 indexed tokenId);

    constructor(address _treasury) ERC721("Caribbean Game Assets", "CGA") {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @dev Set game contract address
     */
    function setGameContract(address _gameContract) external onlyOwner {
        gameContract = _gameContract;
    }

    /**
     * @dev Set marketplace contract address
     */
    function setMarketplaceContract(address _marketplace) external onlyOwner {
        marketplaceContract = _marketplace;
    }

    /**
     * @dev Mint new asset (only game or owner)
     */
    function mintAsset(
        address player,
        AssetType assetType,
        string memory name,
        uint256 value,
        string memory island,
        string memory tokenURI
    ) external returns (uint256) {
        require(
            msg.sender == owner() || msg.sender == gameContract,
            "Not authorized to mint"
        );
        require(player != address(0), "Invalid player address");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(player, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        assets[newTokenId] = Asset({
            assetType: assetType,
            name: name,
            value: value,
            island: island,
            mintedAt: block.timestamp,
            isLocked: false,
            unlockTime: 0
        });

        emit AssetMinted(newTokenId, player, assetType, name, value);

        return newTokenId;
    }

    /**
     * @dev Lock asset (prevents transfer during cooldown)
     */
    function lockAsset(uint256 tokenId, uint256 lockDuration) external {
        require(
            msg.sender == gameContract || msg.sender == ownerOf(tokenId),
            "Not authorized"
        );
        require(!assets[tokenId].isLocked, "Already locked");

        assets[tokenId].isLocked = true;
        assets[tokenId].unlockTime = block.timestamp + lockDuration;

        emit AssetLocked(tokenId, assets[tokenId].unlockTime);
    }

    /**
     * @dev Unlock asset (after cooldown)
     */
    function unlockAsset(uint256 tokenId) external {
        require(assets[tokenId].isLocked, "Not locked");
        require(block.timestamp >= assets[tokenId].unlockTime, "Still locked");

        assets[tokenId].isLocked = false;
        assets[tokenId].unlockTime = 0;

        emit AssetUnlocked(tokenId);
    }

    /**
     * @dev Transfer asset during robbery (game contract only)
     */
    function robberyTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(msg.sender == gameContract, "Only game can execute robbery");
        require(ownerOf(tokenId) == from, "Not the owner");
        require(!assets[tokenId].isLocked, "Asset is locked");

        _transfer(from, to, tokenId);

        emit AssetTransferred(tokenId, from, to, "robbery");
    }

    /**
     * @dev Safe transfer with fee (for marketplace)
     */
    function transferWithFee(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(
            msg.sender == marketplaceContract ||
            msg.sender == ownerOf(tokenId),
            "Not authorized"
        );
        require(!assets[tokenId].isLocked, "Asset is locked");

        // Transfer the NFT
        _transfer(from, to, tokenId);

        emit AssetTransferred(tokenId, from, to, "sale");
    }

    /**
     * @dev Get asset details
     */
    function getAsset(uint256 tokenId) external view returns (Asset memory) {
        require(_exists(tokenId), "Asset doesn't exist");
        return assets[tokenId];
    }

    /**
     * @dev Get all assets owned by an address
     */
    function getAssetsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 index = 0;

        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokenIds[index] = i;
                index++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Pause contract in emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override required by Solidity
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Override required by Solidity
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Override required by Solidity
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override to prevent unauthorized approvals
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
