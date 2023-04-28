# CS2510 Final Project - CryptoGrader

This is our implementation of the Final Project for CS-2510 (Distributed) Computer Operating Systems. This file gives instructions on how to set up the network and run the client programs as student or instructor.

### Application

## Running the application

The Fabric test network is used to deploy and run this sample. Follow these steps in order:

1. Create the test network and a channel (from the `test-network` folder).
   ```
   ./network.sh up createChannel -c mychannel -ca
   ```

1. Deploy the smart contract implementations (from the `test-network` folder).
   ```
   # To deploy the Go chaincode implementation
   ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go/ -ccl go
   ```

1. Run the application (from the `asset-transfer-basic` folder).
   ```
   # To run the Go sample application
   cd asset-transfer-basic/application-gateway-go
   ```
   
   `go run student.go` or `go run instructor.go`

## Program Commands for students
**(Note the brackets {} are not included in the commands)**

To view all assignments, run:

`v all`

To view specific assignments, run:

`v {assignmentID}`

To submit assignments, run:

`s {assignmentID}`

To go back to the class page, run:

`b`

To quit the program, run:

`q`

## Program Commands for instructors
**(Note the brackets {} are not included in the commands)**

To view all assignments, run:

`v all`

To view specific assignments, run:

`v {assignmentID}`

To create assignments, run:

`c`

To grade assignments, run:

`g {assignmentID}`

To go back to the class page, run:

`b`

To quit the program, run:

`q`

## Clean up

When you are finished, you can bring down the test network (from the `test-network` folder). The command will remove all the nodes of the test network, and delete any ledger data that you created.

```
./network.sh down
```
