import React, { useRef } from "react";
import { Button, Box } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import SaveIcon from "@mui/icons-material/Save";
import { useTasks } from "../store/TasksContext";

export default function CSVImport() {
  const { importCSV, importExcel, exportCSV, exportExcel, saveTasks, removeDuplicates } = useTasks();
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      importCSV(csvText);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await importExcel(file);
      alert('Excel file imported successfully!');
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Error importing Excel file. Please check the console for details.');
    }
    e.target.value = ''; // Reset input
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelUpload}
        style={{ display: 'none' }}
      />
      <Button
        variant="contained"
        startIcon={<UploadFileIcon />}
        onClick={() => fileInputRef.current?.click()}
      >
        Import CSV
      </Button>
      <Button
        variant="contained"
        startIcon={<UploadFileIcon />}
        onClick={() => excelInputRef.current?.click()}
      >
        Import Excel
      </Button>
      <Button
        variant="contained"
        color="success"
        startIcon={<SaveIcon />}
        onClick={saveTasks}
      >
        Save
      </Button>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={exportCSV}
      >
        Export CSV
      </Button>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={exportExcel}
      >
        Export Excel
      </Button>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<DeleteSweepIcon />}
        onClick={removeDuplicates}
      >
        Remove Duplicates
      </Button>
    </Box>
  );
}

