// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HederaValuationContract {
    struct Valuation {
        string prj_id;
        bytes valuation_hash;
        uint256 submission_time;
    }

    Valuation[] public valuations;

    event ValuationHashSubmitted(
        uint256 indexed valuationIndex,
        string prj_id,
        bytes valuation_hash,
        uint256 submission_time
    );

    function submitValuationHash(
        string memory prj_id,
        bytes memory valuation_hash
    ) public {
        require(bytes(prj_id).length > 0, "Project ID is required.");
        require(valuation_hash.length == 32, "Valuation hash must be 32 bytes.");

        uint256 valuationIndex = valuations.length;

        valuations.push(
            Valuation({
                prj_id: prj_id,
                valuation_hash: valuation_hash,
                submission_time: block.timestamp
            })
        );

        emit ValuationHashSubmitted(
            valuationIndex,
            prj_id,
            valuation_hash,
            block.timestamp
        );
    }

    function getValuations() public view returns (Valuation[] memory) {
        return valuations;
    }

    function getValuationById(uint256 valuationIndex) public view returns (Valuation memory) {
        require(valuationIndex < valuations.length, "Valuation does not exist.");
        return valuations[valuationIndex];
    }
}
