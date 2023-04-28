package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// Asset describes basic details of what makes up a simple asset
// Insert struct field in alphabetic order => to achieve determinism across languages
// golang keeps the order when marshal to json but doesn't order automatically
// type Asset struct {
// 	AppraisedValue int    `json:"AppraisedValue"`
// 	Color          string `json:"Color"`
// 	ID             string `json:"ID"`
// 	Owner          string `json:"Owner"`
// 	Size           int    `json:"Size"`
// }

type Asset struct {
	Title        string `json:"Title"`
	Date         string `json:"Date"`
	Description  string `json:"Description"`
	Grade        int    `json:"Grade"`
	ID           string `json:"ID"`
	InstructorID string `json:"InstructorID"`
	Work         string `json:"Work"`
	Owner        string `json:"Owner"`
	ClassID      string `json:"ClassID"`
}

// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	// assets := []Asset{
	// 	{ID: "asset1", Color: "blue", Size: 5, Owner: "Tomoko", AppraisedValue: 300},
	// 	{ID: "asset2", Color: "red", Size: 5, Owner: "Brad", AppraisedValue: 400},
	// 	{ID: "asset3", Color: "green", Size: 10, Owner: "Jin Soo", AppraisedValue: 500},
	// 	{ID: "asset4", Color: "yellow", Size: 10, Owner: "Max", AppraisedValue: 600},
	// 	{ID: "asset5", Color: "black", Size: 15, Owner: "Adriana", AppraisedValue: 700},
	// 	{ID: "asset6", Color: "white", Size: 15, Owner: "Michel", AppraisedValue: 800},
	// }

	// assets := []Asset{
	// 	{ID: "student1", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// 	{ID: "student2", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// 	{ID: "student3", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// 	{ID: "student4", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// 	{ID: "student5", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// 	{ID: "student6", Title: "Title1", Date: "4/24/2023", Description: "Description 1", Grade: 0, Owner: "Instructor", Work: "", InstructorID: "Instructor"},
	// }

	// for _, asset := range assets {
	// 	assetJSON, err := json.Marshal(asset)
	// 	if err != nil {
	// 		return err
	// 	}

	// 	err = ctx.GetStub().PutState(asset.ID, assetJSON)
	// 	if err != nil {
	// 		return fmt.Errorf("failed to put to world state. %v", err)
	// 	}
	// }

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, title string, grade int, owner string, date string, description string, class string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	// asset := Asset{
	// 	ID:             id,
	// 	Color:          color,
	// 	Size:           size,
	// 	Owner:          owner,
	// 	AppraisedValue: appraisedValue,
	// }

	asset := Asset{
		ID:           id,
		Title:        title,
		Date:         date,
		Description:  description,
		InstructorID: owner,
		Grade:        grade,
		Work:         "",
		Owner:        owner,
		ClassID:      class,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, id string, title string, grade int, owner string, date string, description string, class string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	// overwriting original asset with new asset
	// asset := Asset{
	// 	ID:             id,
	// 	Color:          color,
	// 	Size:           size,
	// 	Owner:          owner,
	// 	AppraisedValue: appraisedValue,
	// }
	asset := Asset{
		ID:           id,
		Title:        title,
		Date:         date,
		Description:  description,
		Work:         "",
		InstructorID: "",
		Grade:        grade,
		Owner:        owner,
		ClassID:      class,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) (string, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return "", err
	}

	oldOwner := asset.Owner
	asset.Owner = newOwner

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return "", err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return "", err
	}

	return oldOwner, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
func (s *SmartContract) GradeAssignment(ctx contractapi.TransactionContextInterface, id string, grade int) (int, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return -1, err
	}

	oldGrade := asset.Grade
	asset.Grade = grade

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return -1, err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return -1, err
	}

	return oldGrade, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
func (s *SmartContract) SubmitAssignment(ctx contractapi.TransactionContextInterface, id string, work string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	// oldGrade := asset.Grade
	asset.Work = work

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}

	return nil
}

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface, username string, class string) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		if asset.InstructorID == username && asset.Owner == username && asset.ClassID == class {
			assets = append(assets, &asset)
		}
		//assets = append(assets, &asset)
	}

	return assets, nil
}

// GetAllClasses returns all classes of a given username
func (s *SmartContract) GetAllClasses(ctx contractapi.TransactionContextInterface, username string) ([]string, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	classes := map[string]int{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		if asset.InstructorID == username || asset.ID[len(asset.ID)-len(username):] == username {
			classes[asset.ClassID] = 1
		}
	}
	var result []string
	for class, _ := range classes {
		result = append(result, class)
	}

	return result, nil
}

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssignments(ctx contractapi.TransactionContextInterface, username string, class string) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		if asset.Owner == username && asset.ClassID == class {
			assets = append(assets, &asset)
		}
	}

	return assets, nil
}

func (s *SmartContract) GetSubmittedAssignments(ctx contractapi.TransactionContextInterface, username string, class string) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		if asset.ID[len(asset.ID)-len(username):] == username && asset.Owner != username && asset.ClassID == class {
			assets = append(assets, &asset)
		}
	}

	return assets, nil
}
