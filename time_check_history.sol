pragma solidity ^0.4.25;

contract TimeCheck{
	address private _owner = msg.sender;
	mapping (uint256 => DayWork) private dayWorkHistory;
	uint256 private counter;

	struct DayWork {
		uint256 timestamp;
		string hash;
	}
	
	constructor() public {
	    counter = 0;
	}

	modifier onlyOwner {
	  if(msg.sender != _owner) revert();
	  _;
	}

	function size() public onlyOwner returns (uint256) {
	    return counter;
	}

	function getDayOfWork(uint index) onlyOwner public returns (uint256, string) {
		return (dayWorkHistory[index].timestamp, dayWorkHistory[index].hash);
	}

	function addDayOfWork(string hash) onlyOwner public {
	  counter++;
	  dayWorkHistory[counter].timestamp = timeCall();
	  dayWorkHistory[counter].hash = hash;
	}

    function timeCall() private returns (uint256){
      return now;
    }

}