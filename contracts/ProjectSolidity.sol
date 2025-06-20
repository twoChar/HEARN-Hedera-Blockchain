// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HederaProjectContract {
    struct Project {
        string prj_id;        
        bytes prj_hash;       
        uint256 submission_time; 
    }

    Project[] public projects;

    event ProjectHashSubmitted(
        uint256 indexed projectIndex,
        string prj_id,
        bytes prj_hash,
        uint256 submission_time 
    );

    function submitProjectHash(
        string memory prj_id,
        bytes memory prj_hash
    ) public {
        require(bytes(prj_id).length > 0, "Project ID is required.");
        require(prj_hash.length == 32, "Project hash must be 32 bytes.");

        uint256 projectIndex = projects.length;

        projects.push(
            Project({
                prj_id: prj_id,
                prj_hash: prj_hash,
                submission_time: block.timestamp // Store the current timestamp
            })
        );

        emit ProjectHashSubmitted(
            projectIndex,
            prj_id,
            prj_hash,
            block.timestamp // Include the timestamp in the event
        );
    }

    // Fetch all stored project hashes
    function getProjects() public view returns (Project[] memory) {
        return projects;
    }

    // Fetch a specific project by index
    function getProjectById(uint256 projectIndex) public view returns (Project memory) {
        require(projectIndex < projects.length, "Project does not exist.");
        return projects[projectIndex];
    }
}
