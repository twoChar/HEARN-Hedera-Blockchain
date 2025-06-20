// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HederaAssetContract {
    struct Asset {
        string asset_id;
        bytes asset_hash;
        uint256 submission_time;
    }

    Asset[] public assets;

    event AssetHashSubmitted(
        uint256 indexed assetIndex,
        string asset_id,
        bytes asset_hash,
        uint256 submission_time
    );

    function submitAssetHash(
        string memory asset_id,
        bytes memory asset_hash
    ) public {
        require(bytes(asset_id).length > 0, "Asset ID is required.");
        require(asset_hash.length == 32, "Asset hash must be 32 bytes.");

        uint256 assetIndex = assets.length;

        assets.push(
            Asset({
                asset_id: asset_id,
                asset_hash: asset_hash,
                submission_time: block.timestamp
            })
        );

        emit AssetHashSubmitted(
            assetIndex,
            asset_id,
            asset_hash,
            block.timestamp
        );
    }

    // Fetch all stored asset hashes
    function getAssets() public view returns (Asset[] memory) {
        return assets;
    }

    // Fetch a specific asset by index
    function getAssetById(uint256 assetIndex) public view returns (Asset memory) {
        require(assetIndex < assets.length, "Asset does not exist.");
        return assets[assetIndex];
    }
}
