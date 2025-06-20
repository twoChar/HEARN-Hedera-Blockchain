// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HederaSoulboundContract {
    struct Soulbound {
        string prj_id;
        bytes soulbound_hash;
        uint256 submission_time;
    }

    Soulbound[] public soulbounds;

    event SoulboundHashSubmitted(
        uint256 indexed soulboundIndex,
        string prj_id,
        bytes soulbound_hash,
        uint256 submission_time
    );

    function submitSoulboundHash(
        string memory prj_id,
        bytes memory soulbound_hash
    ) public {
        require(bytes(prj_id).length > 0, "Project ID is required.");
        require(soulbound_hash.length == 32, "Soulbound hash must be 32 bytes.");

        uint256 soulboundIndex = soulbounds.length;

        soulbounds.push(
            Soulbound({
                prj_id: prj_id,
                soulbound_hash: soulbound_hash,
                submission_time: block.timestamp
            })
        );

        emit SoulboundHashSubmitted(
            soulboundIndex,
            prj_id,
            soulbound_hash,
            block.timestamp
        );
    }

    function getSoulbounds() public view returns (Soulbound[] memory) {
        return soulbounds;
    }

    function getSoulboundById(uint256 soulboundIndex) public view returns (Soulbound memory) {
        require(soulboundIndex < soulbounds.length, "Soulbound does not exist.");
        return soulbounds[soulboundIndex];
    }
}
