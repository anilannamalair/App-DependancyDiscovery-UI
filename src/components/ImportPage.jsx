import React, { useState, useEffect } from 'react';
import Papa from 'papaparse'; // For parsing CSV files
import * as XLSX from 'xlsx'; // For creating Excel files
import 'bootstrap/dist/css/bootstrap.min.css';
import './ImportPage.css'; // Import your custom CSS file here
function ImportPage() {
  const [csvFile, setCsvFile] = useState(null); // To store the uploaded CSV file
  const [importedFileName, setImportedFileName] = useState(''); // File name for display
  const [assessmentData, setAssessmentData] = useState(null); // Store API response data for export
  const [selectedRepo, setSelectedRepo] = useState(''); // Store selected repository URL
  const [selectedService, setSelectedService] = useState(''); // Store selected service name (serviceA, serviceB)
  const [processingStatus, setProcessingStatus] = useState(''); // Track import processing
  const [isLoading, setIsLoading] = useState(false); // Track loading state for the "Generate Assessment Data" process
  const [showPopup, setShowPopup] = useState(false); // Track the visibility of the success popup
  const [serviceTableData, setServiceTableData] = useState(null); // Store the data to display in the table
  const [selectedArtifact, setSelectedArtifact] = useState(null); // Line 15
  const [showFolderStructure, setShowFolderStructure] = useState(false); // To control the folder structure modal visibility
const [folderStructureData, setFolderStructureData] = useState([]); // To store the repoStructure data

  const handleArtifactClick = (artifact) => { // Line 40
    setSelectedArtifact(artifact); // Set the artifact details to display in modal (Line 41)
  };

  // This useEffect will update the service table when repo or service selection changes
  useEffect(() => {
    if (selectedRepo && selectedService && assessmentData) {
      // Get the repo data based on the selected repo
      const repoData = filterRepoData(selectedRepo);
      const serviceData = repoData?.responseDetails[selectedService];
  
      // If service data exists, update the table; otherwise reset the table data
      if (serviceData) {
        setServiceTableData(serviceData);  // Update the table data
      } else {
        setServiceTableData(null);  // Reset the table data if no service data is found
      }
    } else {
      setServiceTableData(null);  // Reset the table if no repo or service is selected
    }
  }, [selectedRepo, selectedService, assessmentData]);  // Dependency array to trigger when either repo or service changes
  
  
  const handleFolderStructureClick = (repoStructure) => {
    setFolderStructureData(repoStructure); // Set the repoStructure to display in modal
    setShowFolderStructure(true); // Open the modal
  };
  
  
  
  

  // Handle file input change (CSV file)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvFile(file);
      setImportedFileName(file.name); // Store the file name for display
    }
  };

  // Handle the import of CSV and its processing
  const handleImportCsv = async () => {
    if (csvFile) {
      setProcessingStatus('Processing the CSV file...');

      // Parse the CSV file
      Papa.parse(csvFile, {
        complete: async (result) => {
          console.log('CSV parsed successfully:', result);

          // Iterate over each row of the CSV
          for (let row of result.data) {
            const { repo_url, access_token } = row;

            // Only process rows with repo_url and access_token
            if (repo_url && access_token) {
              try {
                const response = await fetch(`http://localhost:8080/api/git/clone?repoUrl=${encodeURIComponent(repo_url)}&accessToken=${encodeURIComponent(access_token)}`, {
                  method: 'POST',
                });

                if (response.ok) {
                  setProcessingStatus((prev) => `${prev}\nSuccessfully cloned: ${repo_url}`);
                } else {
                  setProcessingStatus((prev) => `${prev}\nFailed to clone: ${repo_url}`);
                }
              } catch (error) {
                setProcessingStatus((prev) => `${prev}\nError cloning: ${repo_url}`);
              }
            }
          }

          setProcessingStatus(`File ${importedFileName} imported successfully!`);
        },
        header: true, // CSV contains headers like repo_url and access_token
      });
    }
  };
  

  // Function to generate and download the sample CSV input
  const downloadSampleCsv = () => {
    const sampleData = [
      { repo_url: '', access_token: '' }, // A row with empty columns
    ];

    // Create CSV content using Papa.unparse
    const csv = Papa.unparse(sampleData);

    // Create a Blob with the CSV content
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    // Create a link to trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); // Create an object URL for the Blob
    link.download = 'input.csv'; // Filename for the download
    link.click(); // Programmatically click the link to trigger the download
  };

  // Handle generating and downloading the Excel file for selected repo data
  const handleExportToExcel = async () => {
    if (!selectedRepo || !assessmentData) return;
  
    // Filter the selected repository data from the assessmentData
    const selectedRepoData = assessmentData.find(repo => repo.repoUrl === selectedRepo);
  
    if (!selectedRepoData) {
      console.error('Selected repository not found in the data.');
      return;
    }
  
    // Get the response details for the selected service
    const selectedServiceData = selectedRepoData.responseDetails[selectedService];
  
    if (!selectedServiceData) {
      console.error('Selected service not found in the repository data.');
      return;
    }
  
    // Function to format the parameter names
    const camelCaseToReadable = (str) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, str[0].toUpperCase());
    };
  
    // Bold style definition
    const boldStyle = { font: { bold: true } };
  
    // Function to handle nested structures and format them for export
    const formatRepoStructure = (repoStructure) => {
      if (Array.isArray(repoStructure)) {
        return repoStructure.map(item => [item]); // Format the array of strings for export
      }
      return [[JSON.stringify(repoStructure, null, 2)]]; // If it's an object, stringified it
    };
  
    // Transform the data to get parameters and their values (without headers)
    const transformedData = Object.keys(selectedServiceData).map(key => {
      if (key !== 'serviceName' && key !== 'artifacts') {
        let value = selectedServiceData[key];
  
        // Handle 'repoStructure' separately as it's an object
        if (key === 'repoStructure') {
          value = formatRepoStructure(value); // Format repoStructure properly
        }
  
        // Handle 'cloudInfrastructure' as an array, format accordingly
        if (key === 'cloudInfrastructure') {
          value = Array.isArray(value) && value.length > 0 ? value.join(', ') : '[]';
        }
  
        // Format boolean values for readability
        if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        }
  
        return {
          Parameter: camelCaseToReadable(key),
          Value: Array.isArray(value) ? value.join(', ') : value
        };
      }
      return null;
    }).filter(item => item !== null);
  
    // Prepare final data for export
    const finalData = [
      ['Application Details'],  // First row: Header for Application Details
      ['Repo URL', selectedRepo], // Repo URL
      ['Service Name', selectedService], // Service Name
  
      [],  // Two-row gap
  
      ['Generated Assessment Data'], // Header for Assessment Data
      ['Parameter', 'Value'], // Column headers for the tabular data
  
      // Tabular data for parameters and their values
      ...transformedData.map(row => [row.Parameter, row.Value]),
    ];
  
    // Create a new array for the artifact data with the added service name column
    const artifactData = selectedServiceData.artifacts.map((artifact, index) => [
      selectedService,  // Add Service Name column
      `Artifact ${index + 1}`, // Artifact # (Artifact Name)
      artifact.artifactName, // Artifact Name
      artifact.artifactPath, // Artifact Path
      artifact.category, // Artifact Category
      artifact.artifactLocation // Artifact Location
    ]);
  
    // Add headers for the artifact sheet, including the Service Name column
    const artifactSheetData = [
      ['Artifacts Information'],
      ['Service Name', 'Artifact #', 'Artifact Name', 'Artifact Path', 'Category', 'Artifact Location'],
      ...artifactData
    ];
  
    // Create the worksheet for Assessment Data
    const ws1 = XLSX.utils.aoa_to_sheet(finalData);
  
    // Apply bold styles to specific headers using xlsx-style
    ws1['A1'].s = boldStyle; // "Application Details"
    ws1['A2'].s = boldStyle; // "Repo URL"
    ws1['A3'].s = boldStyle; // "Service Name"
    ws1['A6'].s = boldStyle; // "Generated Assessment Data"
    ws1['A7'].s = boldStyle; // "Parameter"
    ws1['B7'].s = boldStyle; // "Value"
  
    // Create the worksheet for Artifact Data
    const ws2 = XLSX.utils.aoa_to_sheet(artifactSheetData);
  
    // Apply bold styles to the artifact sheet headers
    ws2['A1'].s = boldStyle; // "Artifacts Information"
    ws2['A2'].s = boldStyle; // "Service Name"
    ws2['B2'].s = boldStyle; // "Artifact #"
    ws2['C2'].s = boldStyle; // "Artifact Name"
    ws2['D2'].s = boldStyle; // "Artifact Path"
    ws2['E2'].s = boldStyle; // "Category"
    ws2['F2'].s = boldStyle; // "Artifact Location"
  
    // Create the worksheet for Repo Structure Data
    const repoStructureData = formatRepoStructure(selectedServiceData.repoStructure); // Get repo structure data
    const ws3 = XLSX.utils.aoa_to_sheet([['Repo Structure'], ...repoStructureData]);
  
    // Apply bold styles to the repo structure sheet headers
    ws3['A1'].s = boldStyle; // "Repo Structure"
  
    // Create the workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Assessment Data');
    XLSX.utils.book_append_sheet(wb, ws2, 'Artifact Data');
    XLSX.utils.book_append_sheet(wb, ws3, 'Repo Structure'); // Append the new sheet
  
    // Trigger the file download
    XLSX.writeFile(wb, 'assessment_data_with_artifacts_and_repo_structure.xlsx');
  };
  
  
  
  




  
  
  
  

  // Function to handle repo selection from dropdown
  const handleRepoSelect = (event) => {
    const newRepo = event.target.value;
    setSelectedRepo(newRepo);  // Set the selected repo
  
    // Reset service selection and table data when the repo changes
    setSelectedService('');  // Reset the selected service
    setServiceTableData(null);  // Clear the table data
  };
  
  
  
  
  
  

  // Function to handle service selection from dropdown
  const handleServiceSelect = (event) => {
    setSelectedService(event.target.value);
  };

  const camelCaseToReadable = (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, str[0].toUpperCase());
  };

  // Function to filter data by selected repo
  const filterRepoData = (repoUrl) => {
    return assessmentData?.find((repo) => repo.repoUrl === repoUrl) || {}; // Return empty object if not found
  };

  // Function to generate and download the assessment data based on uploaded file
  const handleGenerateExport = async () => {
    setIsLoading(true); // Start loading (freeze the screen)
    setProcessingStatus('Generating assessment data...'); // Update message

    if (csvFile) {
      const formData = new FormData();
      formData.append('file', csvFile);

      try {
        const response = await fetch('http://localhost:8080/api/git/assessment?File', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const data = result.repoDetails;

          if (Array.isArray(data) && data.length > 0) {
            setAssessmentData(data);
            setShowPopup(true); // Show success popup
          } else {
            console.error('Expected an array of repo details, but received:', data);
          }
        } else {
          console.error('Failed to generate assessment data.');
        }
      } catch (error) {
        console.error('Error generating assessment data:', error);
      }

      setIsLoading(false); // Stop loading after processing is done
    }
  };

  const handlePopupClose = () => {
    setShowPopup(false); // Close the popup
    setProcessingStatus(''); // Clear the processing status message
  };

  return (
    <div className="container">
       <h1 style={{ fontSize: '60px', fontWeight: 'bold', textAlign: 'left',marginLeft:'20px' }} >Unified Portal Onboarding</h1>
        <img
    src="/src\assets\brillio.png" // Adjust the path based on where your image is located
    alt="Company Logo"
    className="img-fluid mb-4" // Optional: Use Bootstrap's class to make the image responsive
    style={{ maxWidth: '35px', display: 'block',float: 'right' }} // Optional custom styling
  />
      <div className="content">
     
        <h3>Import and Generate Assessment</h3>
        {/* Download Button placed at top-right */}
        <button
          onClick={downloadSampleCsv}
          className="btn btn-outline-primary download-btn"
        >
          Download Sample CSV
        </button>

        {/* Import and Generate buttons, as well as status handling */}
        <div style={{ marginTop: '30px' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ padding: '10px', fontSize: '16px' }}
            disabled={isLoading}
            className="form-control"
          />
          <button
            onClick={handleImportCsv}
            className="btn btn-success mt-2"
            disabled={isLoading}
            style={{ padding: '10px 20px', fontSize: '16px', marginRight: '5%' }}
          >
            Import CSV
          </button>

          <button
            onClick={handleGenerateExport}
            className="btn btn-info mt-2"
            disabled={isLoading}
            style={{ padding: '10px 20px', fontSize: '16px' }}
          >
            Generate Assessment Data
          </button>
        </div>

        {/* Processing status message */}
        {processingStatus && (
          <div className="processing-status" style={{ marginTop: '20px', fontStyle: 'italic' }}>
            <p>{processingStatus}</p>
          </div>
        )}

        {/* Dropdown to select a repo URL */}
        {assessmentData && (
          <div className="mt-4">
            <label htmlFor="repoSelect">Select a repository:</label>
            <select
              id="repoSelect"
              className="form-select mt-2"
              onChange={handleRepoSelect}
              disabled={isLoading}
            >
              <option value="">-- Select a Repository --</option>
              {assessmentData.map((repo, index) => (
                <option key={index} value={repo.repoUrl}>
                  {repo.repoUrl}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRepo && (
          <div className="mt-4">
            <label htmlFor="serviceSelect">Select a Service:</label>
            <select
              id="serviceSelect"
              className="form-select mt-2"
              onChange={handleServiceSelect}
              disabled={isLoading}
            >
              <option value="">-- Select a Service --</option>
              {Object.keys(filterRepoData(selectedRepo)?.responseDetails || {}).map((service, index) => (
                <option key={index} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Display service parameters */}
        {selectedRepo && selectedService && serviceTableData && (
  <div className="mt-4">
    <h2>Assessment Data for {selectedService}</h2>
    <table className="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
      {Object.entries(serviceTableData).map(([key, value], index) => {
  if (key === 'artifacts') {
    // Handle artifacts as before
    return (
      <tr key={index}>
        <td>{camelCaseToReadable(key)}</td>
        <td>
          {Array.isArray(value) && value.length > 0 ? (
            value.map((artifact, artifactIndex) => (
              <div key={artifactIndex}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleArtifactClick(artifact);
                  }}
                  style={{ cursor: 'pointer', color: 'blue' }}
                >
                  {artifact.artifactName}
                </a>
              </div>
            ))
          ) : (
            'No Artifacts Found'
          )}
        </td>
      </tr>
    );
  } else {
    let formattedValue = value;

    if (key === 'repoStructure') {
      // Instead of showing the repoStructure, show the clickable link
      formattedValue = (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleFolderStructureClick(value); // Show the folder structure in modal
          }}
          style={{ cursor: 'pointer', color: 'blue' }}
        >
          Click here to view folder structure
        </a>
      );
    }

    // Other key handling...
    return (
      <tr key={index}>
        <td>{camelCaseToReadable(key)}</td>
        <td>{formattedValue}</td>
      </tr>
    );
  }
})}


      </tbody>
    </table>
  </div>
)}

{selectedArtifact && ( // Line 75
  <div className="modal fade show" tabIndex="-1" aria-labelledby="artifactModalLabel" style={{ display: 'block' }}> 
    <div className="modal-dialog modal-dialog-centered"> 
      <div className="modal-content"> 
        <div className="modal-header"> 
          <h5 className="modal-title" id="artifactModalLabel">Artifact Details</h5> 
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
            onClick={() => setSelectedArtifact(null)} // Close the modal
          ></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}> {/* Line 85 - Added overflowY and maxHeight */}
          <table className="table table-striped"> 
            <tbody> 
              <tr> 
                <th>Artifact Name</th> 
                <td>{selectedArtifact.artifactName}</td> 
              </tr> 
              <tr> 
                <th>Artifact Path</th> 
                <td>{selectedArtifact.artifactPath}</td> 
              </tr> 
              <tr> 
                <th>Category</th> 
                <td>{selectedArtifact.category}</td> 
              </tr> 
              <tr> 
                <th>Location</th> 
                <td>{selectedArtifact.artifactLocation}</td> 
              </tr> 
            </tbody> 
          </table>
        </div> 
        <div className="modal-footer"> 
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedArtifact(null)} // Close the modal
          >
            Close
          </button> 
        </div> 
      </div> 
    </div> 
  </div>
)}


      </div>

      {/* Success Popup */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="modal fade show" tabIndex="-1" aria-hidden="true" style={{ display: 'block' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Assessment Data Ready!</h5>
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    onClick={handlePopupClose}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>The assessment data has been successfully generated.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handlePopupClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFolderStructure && (
  <div className="modal fade show" tabIndex="-1" aria-labelledby="folderStructureModalLabel" style={{ display: 'block' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title" id="folderStructureModalLabel">Folder Structure</h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
            onClick={() => setShowFolderStructure(false)} // Close the modal
          ></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <h6>Folder Structure:</h6>
          {folderStructureData && folderStructureData.length > 0 ? (
            folderStructureData.map((folder, index) => (
              <div key={index}>{folder}</div>
            ))
          ) : (
            <p>No folder structure available</p>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowFolderStructure(false)} // Close the modal
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}


    {/* Full-Screen Loading Overlay */}
{isLoading && (
  <div className="loading-overlay">
    <div className="spinner-container">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-white">Generating Assessment Data. Please Wait...</p>
    </div>
  </div>
)}
       {/* Export to Excel Button */}
{selectedRepo && selectedService && (
  <button
    onClick={handleExportToExcel}
    className="btn btn-warning mt-3"
    disabled={isLoading} // Disable during loading
  >
    Export to Excel
  </button>
)}
    </div>
  );
}

export default ImportPage;
