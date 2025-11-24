import React, { useRef } from "react";
import { Button, Box } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useTasks } from "../store/TasksContext";

export default function CSVImport() {
  const { importCSV, exportCSV, removeDuplicates } = useTasks();
  const fileInputRef = useRef(null);

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

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
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
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={exportCSV}
      >
        Export CSV
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

