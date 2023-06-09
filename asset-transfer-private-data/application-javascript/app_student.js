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

function verifyAssetData(org, resultBuffer, expectedId, color, size, ownerUserId, appraisedValue) {

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
    if (asset.color !== color) {
        doFail(`asset ${asset.assetID} has color of ${asset.color}, expected value ${color}`);
    }
    if (asset.size !== size) {
        doFail(`Failed size check - asset ${asset.assetID} has size of ${asset.size}, expected value ${size}`);
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


async function initContractFromOrg2Identity() {
    console.log('\n--> Fabric client user & Gateway init: Using Org2 identity to Org2 Peer');
    const ccpOrg2 = buildCCPOrg2();
    const caOrg2Client = buildCAClient(FabricCAServices, ccpOrg2, 'ca.org2.example.com');

    const walletPathOrg2 = path.join(__dirname, 'wallet/org2');
    const walletOrg2 = await buildWallet(Wallets, walletPathOrg2);

    await enrollAdmin(caOrg2Client, walletOrg2, mspOrg2);
    await registerAndEnrollUser(caOrg2Client, walletOrg2, mspOrg2, Org2UserId, 'org2.department1');

    try {
        // Create a new gateway for connecting to Org's peer node.
        const gatewayOrg2 = new Gateway();
        await gatewayOrg2.connect(ccpOrg2,
            { wallet: walletOrg2, identity: Org2UserId, discovery: { enabled: true, asLocalhost: true } });

        return gatewayOrg2;
    } catch (error) {
        console.error(`Error in connecting to gateway: ${error}`);
        process.exit(1);
    }
}

// login
async function login() {
    /** ~~~~~~~ Fabric client init: Using Org2 identity to Org2 Peer ~~~~~~~ */
    const gatewayOrg2 = await initContractFromOrg2Identity();
    const networkOrg2 = await gatewayOrg2.getNetwork(myChannel);
    const contractOrg2 = networkOrg2.getContract(myChaincodeName);
    contractOrg2.addDiscoveryInterest({ name: myChaincodeName, collectionNames: [memberAssetCollectionName, org2PrivateCollectionName] });

    return contractOrg2
}

// submit assignment, update asset, transfer to instructor
async function submitAssignment(contractOrg2, contractOrg1) {
    let assetID2 = `asset2`;
    const assetType = 'ValuableAsset';
    let result;
    let asset1Data = { objectType: assetType, assetID: assetID2, essay: 'CS 1511', grade: 20, name: "joel", appraisedValue: 100 };

    console.log('\n**************** As Org2 Client ****************');
    console.log('Adding Assets to work with:\n--> Submit Transaction: CreateAsset ' + assetID2);
    let statefulTxn = contractOrg2.createTransaction('CreateAsset');
    // if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
    // statefulTxn.setEndorsingOrganizations(mspOrg1);
    let tmapData = Buffer.from(JSON.stringify(asset1Data));
    statefulTxn.setTransient({
        asset_properties: tmapData
    });
    result = await statefulTxn.submit();

    // // Buyer from Org2 agrees to buy the asset assetID2 //
    // // To purchase the asset, the buyer needs to agree to the same value as the asset owner
    // let dataForAgreement = { assetID: assetID2, appraisedValue: 100 };
    // console.log('\n--> Submit Transaction: AgreeToTransfer payload ' + JSON.stringify(dataForAgreement));
    // statefulTxn = contractOrg1.createTransaction('AgreeToTransfer');
    // tmapData = Buffer.from(JSON.stringify(dataForAgreement));
    // statefulTxn.setTransient({
    //     asset_value: tmapData
    // });
    // result = await statefulTxn.submit();

    // Transfer the asset to Org2 //
    // To transfer the asset, the owner needs to pass the MSP ID of new asset owner, and initiate the transfer
    console.log('\n--> Submit Transaction: TransferAsset ' + assetID2);

    statefulTxn = contractOrg2.createTransaction('TransferAsset');
    tmapData = Buffer.from(JSON.stringify(buyerDetails));
    statefulTxn.setTransient({
        asset_owner: tmapData
    });
    result = await statefulTxn.submit();
}

// view submission, read asset
async function viewAssignment() {

}


// Main workflow : usecase details at asset-transfer-private-data/chaincode-go/README.md
// This app uses fabric-samples/test-network based setup and the companion chaincode
// For this usecase illustration, we will use both Org1 & Org2 client identity from this same app
// In real world the Org1 & Org2 identity will be used in different apps to achieve asset transfer.
async function main() {
    try {
        contractOrg2 = login()
        submitAssignment(contractOrg2, org1PrivateCollectionName)
        viewAssignment(org1PrivateCollectionName)
    } catch (error) {
        console.error(`Error in transaction: ${error}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
