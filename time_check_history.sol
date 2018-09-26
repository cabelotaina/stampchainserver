pragma solidity ^0.4.25;

contract TimeCheck{
	address private _owner = msg.sender;
	
	struct DayWork {
		uint256 timestamp;
		string hash;
	}
	
	struct AccountInfo { 
	  mapping (uint256 => DayWork) dayWorkHistory;
	  uint256 counter;
	}
	
	mapping (address => AccountInfo) private workers;

	function size() public view returns (uint256) {
	    return workers[msg.sender].counter;
	}

	function getDayOfWork(uint256 index) public view returns (uint256, string) {
		return (workers[msg.sender].dayWorkHistory[index].timestamp, workers[msg.sender].dayWorkHistory[index].hash);
	}

	function addDayOfWork(string hash) public {
	  workers[msg.sender].counter++;
	  workers[msg.sender].dayWorkHistory[workers[msg.sender].counter].timestamp = timeCall();
	  workers[msg.sender].dayWorkHistory[workers[msg.sender].counter].hash = hash;
	}

    function timeCall() private view returns (uint256){
      return now;
    }

}