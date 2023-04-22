/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const myChannel = 'mychannel';
const myChaincodeName = 'private';

const memberAssetCollectionName = 'assetCollection';
const org1PrivateCollectionName = 'Org1MSPPrivateCollection';
const org2PrivateCollectionName = 'Org2MSPPrivateCollection';
const mspOrg1 = 'Org1MSP';
const mspOrg2 = 'Org2MSP';
const Org1UserId = 'appUser1';
const Org2UserId = 'appUser2';

const RED = '\x1b[31m\n';
const RESET = '\x1b[0m';

function prettyJSONString(inputString) {
    if (inputString) {
        return JSON.stringify(JSON.parse(inputString), null, 2);
    }
    else {
        return inputString;
    }
}

function doFail(msgString) {
    console.error(`${RED}\t${msgString}${RESET}`);
    process.exit(1);
}

function verifyAssetData(org, resultBuffer, expectedId, essay, name, grade, ownerUserId, appraisedValue) {

    let asset;
    if (resultBuffer) {
        asset = JSON.parse(resultBuffer.toString('utf8'));
    } else {
        doFail('Failed to read asset');
    }
    console.log(`*** verify asset data for: ${expectedId}`);
    if (!asset) {
        doFail('Received empty asset');
    }
    if (expectedId !== asset.assetID) {
        doFail(`recieved asset ${asset.assetID} , but expected ${expectedId}`);
    }
    if (asset.essay !== essay) {
        doFail(`asset ${asset.assetID} has essay of ${asset.essay}, expected value ${essay}`);
    }
    if (asset.name !== name) {
        doFail(`Failed name check - asset ${asset.assetID} has name of ${asset.name}, expected value ${name}`);
    }
    if (asset.grade !== grade) {
        doFail(`Failed grade check - asset ${asset.assetID} has grade of ${asset.grade}, expected value ${grade}`);
    }

    if (asset.owner.includes(ownerUserId)) {
        console.log(`\tasset ${asset.assetID} owner: ${asset.owner}`);
    } else {
        doFail(`Failed owner check from ${org} - asset ${asset.assetID} owned by ${asset.owner}, expected userId ${ownerUserId}`);
    }
    if (appraisedValue) {
        if (asset.appraisedValue !== appraisedValue) {
            doFail(`Failed appraised value check from ${org} - asset ${asset.assetID} has appraised value of ${asset.appraisedValue}, expected value ${appraisedValue}`);
        }
    }
}

function verifyAssetPrivateDetails(resultBuffer, expectedId, appraisedValue) {
    let assetPD;
    if (resultBuffer) {
        assetPD = JSON.parse(resultBuffer.toString('utf8'));
    } else {
        doFail('Failed to read asset private details');
    }
    console.log(`*** verify private details: ${expectedId}`);
    if (!assetPD) {
        doFail('Received empty data');
    }
    if (expectedId !== assetPD.assetID) {
        doFail(`recieved ${assetPD.assetID} , but expected ${expectedId}`);
    }

    if (appraisedValue) {
        if (assetPD.appraisedValue !== appraisedValue) {
            doFail(`Failed appraised value check - asset ${assetPD.assetID} has appraised value of ${assetPD.appraisedValue}, expected value ${appraisedValue}`);
        }
    }
}

async function initContractFromOrg1Identity() {
    console.log('\nPRINTING WALLET: ' + Wallets)
    console.log('\n--> Fabric client user & Gateway init: Using Org1 identity to Org1 Peer');
    // build an in memory object with the network configuration (also known as a connection profile)
    const ccpOrg1 = buildCCPOrg1();
    console.log('\n**************** line 106 ****************')
    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caOrg1Client = buildCAClient(FabricCAServices, ccpOrg1, 'ca.org1.example.com');
    console.log('\n**************** line 110 ****************')
    // setup the wallet to cache the credentials of the application user, on the app server locally
    const walletPathOrg1 = path.join(__dirname, 'wallet/org1');
    const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);
    console.log('\n**************** line 114 ****************')
    // in a real application this would be done on an administrative flow, and only once
    // stores admin identity in local wallet, if needed
    await enrollAdmin(caOrg1Client, walletOrg1, mspOrg1);
    console.log('\n**************** line 118 ****************')
    // register & enroll application user with CA, which is used as client identify to make chaincode calls
    // and stores app user identity in local wallet
    // In a real application this would be done only when a new user was required to be added
    // and would be part of an administrative flow
    await registerAndEnrollUser(caOrg1Client, walletOrg1, mspOrg1, Org1UserId, 'org1.department1');
    console.log('\n**************** line 124 ****************')

    try {
        // Create a new gateway for connecting to Org's peer node.
        const gatewayOrg1 = new Gateway();
        console.log('\n**************** line 129 ****************')
        // Connect using Discovery enabled
        await gatewayOrg1.connect(ccpOrg1,
            { wallet: walletOrg1, identity: Org1UserId, discovery: { enabled: true, asLocalhost: true } });
        console.log('\n**************** line 133 ****************')
        return gatewayOrg1;
    } catch (error) {
        console.error(`Error in connecting to gateway: ${error}`);
        process.exit(1);
    }
}

// login 
async function login() {
    /** ******* Fabric client init: Using Org1 identity to Org1 Peer ********** */
    console.log("\n**************** LOGING ****************");
    const gatewayOrg1 = await initContractFromOrg1Identity();
    console.log("GATEWAY: " + gatewayOrg1);
    const networkOrg1 = await gatewayOrg1.getNetwork(myChannel);
    console.log("NETWORK: " + networkOrg1);
    const contractOrg1 = networkOrg1.getContract(myChaincodeName);
    // Since this sample chaincode uses, Private Data Collection level endorsement policy, addDiscoveryInterest
    // scopes the discovery service further to use the endorsement policies of collections, if any
    contractOrg1.addDiscoveryInterest({ name: myChaincodeName, collectionNames: [memberAssetCollectionName, org1PrivateCollectionName] });

    console.log(contractOrg1)
    return contractOrg1
}

// post assignment, create asset and transfer to students
async function postAssignment(contractOrg1) {
    console.log(contractOrg1);
    let assetID1 = `asset1`;
    const assetType = 'ValuableAsset';
    let result;
    let asset1Data = { objectType: assetType, assetID: assetID1, essay: 'CS 1511', grade: 20, name: "brian", appraisedValue: 100 };

    console.log('\n**************** As Org1 Client ****************');
    console.log('Adding Assets to work with:\n--> Submit Transaction: CreateAsset ' + assetID1);
    console.log('\n****************fgdgsdf****************fds****************\n')
    let statefulTxn = contractOrg1.createTransaction('CreateAsset');
    // if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
    // statefulTxn.setEndorsingOrganizations(mspOrg1);
    let tmapData = Buffer.from(JSON.stringify(asset1Data));
    statefulTxn.setTransient({
        asset_properties: tmapData
    });
    console.log('\n****************aosidjfpaoisdjf****************apsodfijapdoifj****************\n')
    result = await statefulTxn.submit();

    // // Buyer from Org2 agrees to buy the asset assetID1 //
    // // To purchase the asset, the buyer needs to agree to the same value as the asset owner
    // let dataForAgreement = { assetID: assetID1, appraisedValue: 100 };
    // console.log('\n--> Submit Transaction: AgreeToTransfer payload ' + JSON.stringify(dataForAgreement));
    // statefulTxn = contractOrg2.createTransaction('AgreeToTransfer');
    // tmapData = Buffer.from(JSON.stringify(dataForAgreement));
    // statefulTxn.setTransient({
    //     asset_value: tmapData
    // });
    // result = await statefulTxn.submit();

    // Transfer the asset to Org2 //
    // To transfer the asset, the owner needs to pass the MSP ID of new asset owner, and initiate the transfer
    console.log('\n--> Submit Transaction: TransferAsset ' + assetID1);

    let buyerDetails = { assetID: assetID1, buyerMSP: mspOrg2 };

    statefulTxn = contractOrg1.createTransaction('TransferAsset');
    tmapData = Buffer.from(JSON.stringify(buyerDetails));
    statefulTxn.setTransient({
        asset_owner: tmapData
    });
    result = await statefulTxn.submit();

    return assetID1
}

// view assignment, read asset
async function viewSubmission(assetID1, contractOrg1, assetCollection) {
    console.log('\n--> Evaluate Transaction: read from assetCollection');
    // ReadAssetPrivateDetails reads data from Org's private collection. Args: collectionName, assetID
    result = await contractOrg1.evaluateTransaction('ReadAsset', assetID1);
    console.log(`<-- result: ${prettyJSONString(result.toString())}`);
}

// update asset and transfer to students
async function gradeAssignment(contractOrg1) {
    let assetID1 = `asset1`;
    const assetType = 'ValuableAsset';
    let result;
    let asset1Data = { objectType: assetType, assetID: assetID1, essay: 'CS 1511', grade: 100, name: "brian", appraisedValue: 100 };
    console.log('Submit Transaction: UpdateAsset ' + assetID1);
    let statefulTxn = contractOrg1.createTransaction('UpddateAsset');
    let tmapData = Buffer.from(JSON.stringify(asset1Data));
    statefulTxn.setTransient({
        asset_properties: tmapData
    });
    result = await statefulTxn.submit();
}

// Main workflow : usecase details at asset-transfer-private-data/chaincode-go/README.md
// This app uses fabric-samples/test-network based setup and the companion chaincode
// For this usecase illustration, we will use both Org1 & Org2 client identity from this same app
// In real world the Org1 & Org2 identity will be used in different apps to achieve asset transfer.
// import readline module

async function main() {
    
    const prompt = require('prompt-sync')({sigint: true});

    while (true) {
        // create empty user input
        var input = prompt('Enter command: ');

        var contractOrg1;
        var assetID1;
        var result;
        try {
            if (input == "l") {
                /** ******* Fabric client init: Using Org1 identity to Org1 Peer ********** */
                console.log("\n**************** LOGING ****************");
                const gatewayOrg1 = await initContractFromOrg1Identity();
                console.log("GATEWAY: " + gatewayOrg1);
                const networkOrg1 = await gatewayOrg1.getNetwork(myChannel);
                console.log("NETWORK: " + networkOrg1);
                contractOrg1 = networkOrg1.getContract(myChaincodeName);
                // Since this sample chaincode uses, Private Data Collection level endorsement policy, addDiscoveryInterest
                // scopes the discovery service further to use the endorsement policies of collections, if any
                contractOrg1.addDiscoveryInterest({ name: myChaincodeName, collectionNames: [memberAssetCollectionName, org1PrivateCollectionName] });
            } else if (input == "n") {
                assetID1 = `asset1`;
                const assetType = 'ValuableAsset';
                let asset1Data = { objectType: assetType, assetID: assetID1, essay: 'CS 1511', grade: 20, name: "brian", appraisedValue: 100 };

                console.log('\n**************** As Org1 Client ****************');
                console.log('Adding Assets to work with:\n--> Submit Transaction: CreateAsset ' + assetID1);
                console.log('\n****************fgdgsdf****************fds****************\n')
                let statefulTxn = contractOrg1.createTransaction('CreateAsset');
                // if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
                // statefulTxn.setEndorsingOrganizations(mspOrg1);
                let tmapData = Buffer.from(JSON.stringify(asset1Data));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                console.log('\n****************aosidjfpaoisdjf****************apsodfijapdoifj****************\n')
                result = await statefulTxn.submit();

                // // Buyer from Org2 agrees to buy the asset assetID1 //
                // // To purchase the asset, the buyer needs to agree to the same value as the asset owner
                // let dataForAgreement = { assetID: assetID1, appraisedValue: 100 };
                // console.log('\n--> Submit Transaction: AgreeToTransfer payload ' + JSON.stringify(dataForAgreement));
                // statefulTxn = contractOrg2.createTransaction('AgreeToTransfer');
                // tmapData = Buffer.from(JSON.stringify(dataForAgreement));
                // statefulTxn.setTransient({
                //     asset_value: tmapData
                // });
                // result = await statefulTxn.submit();

                // Transfer the asset to Org2 //
                // To transfer the asset, the owner needs to pass the MSP ID of new asset owner, and initiate the transfer
                console.log('\n--> Submit Transaction: TransferAsset ' + assetID1);

                let buyerDetails = { assetID: assetID1, buyerMSP: mspOrg2 };

                statefulTxn = contractOrg1.createTransaction('TransferAsset');
                tmapData = Buffer.from(JSON.stringify(buyerDetails));
                statefulTxn.setTransient({
                    asset_owner: tmapData
                });
                result = await statefulTxn.submit();

            } else if (input == "v") {
                console.log('\n--> Evaluate Transaction: read from assetCollection');
                // ReadAssetPrivateDetails reads data from Org's private collection. Args: collectionName, assetID
                assetID1 = "asset1"
                result = await contractOrg1.evaluateTransaction('ReadAsset', assetID1);
                console.log(`<-- result: ${prettyJSONString(result.toString())}`);

            } else if (input == "g"){
                assetID1 = `asset1`;
                const assetType = 'ValuableAsset';
                var newData = JSON.parse(result);
                console.log(newData);
                let asset1Data = { objectType: assetType, assetID: assetID1, essay: newData.essay, grade: 100, name: newData.name, owner: newData.owner };
                console.log(asset1Data);
                console.log('Submit Transaction: UpdateAsset ' + assetID1);
                let statefulTxn = contractOrg1.createTransaction('UpdateAsset');
                let tmapData = Buffer.from(JSON.stringify(asset1Data));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();

            } else {
                process.exit(1);
            }
        } catch (error) {
            console.error(`Error in transaction: ${error}`);
            if (error.stack) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
}

main();
