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

  // This useEffect will update the service table when repo or service selection changes
  useEffect(() => {
    if (selectedRepo && selectedService && assessmentData) {
      const repoData = filterRepoData(selectedRepo);
      const serviceData = repoData?.responseDetails[selectedService];
  
      if (serviceData) {
        setServiceTableData(serviceData); // Update the table data
      } else {
        setServiceTableData(null); // Reset table data if no service data is found
      }
    } else {
      setServiceTableData(null); // Reset table data if repo or service is not selected
    }
  }, [selectedRepo, selectedService, assessmentData]);
  

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

  // Transform the data to get parameters and their values (without headers)
  const transformedData = Object.keys(selectedServiceData).map(key => {
    if (key !== 'serviceName') {
      let value = selectedServiceData[key];

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

  // Create the worksheet
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // Apply bold styles to specific headers using xlsx-style
  ws['A1'].s = boldStyle; // "Application Details"
  ws['A2'].s = boldStyle; // "Repo URL"
  ws['A3'].s = boldStyle; // "Service Name"
  ws['A6'].s = boldStyle; // "Generated Assessment Data"
  ws['A7'].s = boldStyle; // "Parameter"
  ws['B7'].s = boldStyle; // "Value"

  // Create the workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assessment Data');

  // Trigger the file download
  XLSX.writeFile(wb, 'assessment_data.xlsx');
};




  
  
  
  

  // Function to handle repo selection from dropdown
  const handleRepoSelect = (event) => {
    const newRepo = event.target.value;
    setSelectedRepo(newRepo);  // Set the selected repo
  
    // Reset the service selection when repo changes
    setSelectedService(''); // This will clear the selected service
  
    // If there are services for the new repo, set the first service as the default
    if (newRepo) {
      const repoData = filterRepoData(newRepo);
      const availableServices = Object.keys(repoData?.responseDetails || {});
      if (availableServices.length > 0) {
        setSelectedService(availableServices[0]); // Set default service to the first one in the list
      }
    }
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
                  if (key !== 'serviceName') {
                    let formattedValue = value;

                    // If the value is an object, convert it to a string (e.g., JSON.stringify)
                    if (typeof value === 'object' && value !== null) {
                      formattedValue = JSON.stringify(value, null, 2); // Beautify object output
                    }

                    // Format arrays for better display
                    if (Array.isArray(value)) {
                      formattedValue = value.join(', ');
                    }

                    return (
                      <tr key={index}>
                        <td>{camelCaseToReadable(key)}</td>
                        <td>{formattedValue}</td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
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
