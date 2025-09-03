interface ProcessingParams {
  action: number;
  resolution?: string;
  aspect_ratio?: string;
  startseconds?: number;
  endseconds?: number;
  extension?: string;
  outputFileName?: string;
}

interface SelectedFile {
  path: string;
  name: string;
  size: number;
}

class VideoProcessorUI {
  private selectedFile: SelectedFile | null = null;
  private selectedOperation: string | null = null;
  private processingParams: ProcessingParams | null = null;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.setupFileUpload();

    // Enable operation mode cards after file upload
    this.setupOperationSelection();

    // Handle execution after selecting operation mode and showing settings
    this.setupExecuteButton();
  }

  private async setupFileUpload(): Promise<void> {
    const uploadArea = document.getElementById("uploadArea") as HTMLDivElement;
    const fileInfo = document.getElementById("fileInfo") as HTMLDivElement;
    const fileName = document.getElementById(
      "fileName",
    ) as HTMLParagraphElement;

    uploadArea.addEventListener("click", async () => {
      try {
        const filePath = await (window as any).electronAPI.openVideoDialog();

        if (filePath) {
          const fileStats = await (window as any).electronAPI.getFileStats(
            filePath,
          );

          const maxSize = Math.pow(2, 40);
          if (fileStats.size > maxSize) {
            alert("Video file size must be under 1TB.");
            return;
          }

          const selectedFileName = filePath.split(/[\\/]/).pop() || "Unknown";

          this.selectedFile = {
            path: filePath,
            name: selectedFileName,
            size: fileStats.size,
          };

          fileName.textContent = `${selectedFileName} (${this.formatFileSize(fileStats.size)})`;

          fileInfo.classList.remove("hidden");

          this.enableOperationSelection();
        } else {
          alert("Failed to retrieve file information");
          return;
        }
      } catch (error) {
        console.error("Error during file selection:", error);
      }
    });
  }

  // Used in handleFileSelection
  private formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    // Using mathematical property log_n(x) = log(x) / log(n) to calculate base-1024 logarithm
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
  }

  // Used in handleFileSelection
  private enableOperationSelection(): void {
    const operationCards = document.querySelectorAll(".operation-card");
    operationCards.forEach((card) => {
      // Remove disabled property from operation mode cards
      card.classList.remove("disabled");
    });
  }

  private setupOperationSelection(): void {
    const operationCards = document.querySelectorAll(".operation-card");
    const settingsSection = document.getElementById(
      "settingsSection",
    ) as HTMLElement;

    operationCards.forEach((card) => {
      card.addEventListener("click", () => {
        if (!this.selectedFile) {
          alert("Please select a video file first");
          return;
        }

        // Remove selected property from all cards and add to this card when clicked
        operationCards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        // Set selectedOperation (compress, resolution, aspect, audio, gif)
        this.selectedOperation = card.getAttribute("data-operation")!;

        // Show settings section
        settingsSection.classList.remove("hidden");

        // Show relevant settings based on selected operation mode
        this.showRelevantSettings(this.selectedOperation);

        // Enable execute button
        this.updateExecuteButton();
      });
    });
  }

  // Used in setupOperationSelection
  private showRelevantSettings(operation: string): void {
    // Hide all setting-group divs in settings-section
    const settingGroups = document.querySelectorAll(".setting-group");
    settingGroups.forEach((group) => group.classList.add("hidden"));

    // Show setting-group by id based on selected operation mode
    switch (operation) {
      case "resolution":
        document
          .getElementById("resolutionSettings")
          ?.classList.remove("hidden");
        break;
      case "aspect":
        document.getElementById("aspectSettings")?.classList.remove("hidden");
        break;
      case "gif":
        document.getElementById("gifSettings")?.classList.remove("hidden");
        break;
    }

    document.getElementById("outputSettings")?.classList.remove("hidden");
  }

  // Used in setupOperationSelection
  private updateExecuteButton(): void {
    const executeBtn = document.getElementById(
      "executeBtn",
    ) as HTMLButtonElement;
    // Enable clicking when file is set and mode is selected
    if (this.selectedFile && this.selectedOperation) {
      executeBtn.disabled = false;
      executeBtn.textContent = "🚀 Start Conversion";
    }
  }

  private setupExecuteButton(): void {
    const executeBtn = document.getElementById(
      "executeBtn",
    ) as HTMLButtonElement;

    executeBtn.addEventListener("click", async () => {
      if (!this.selectedFile || !this.selectedOperation) {
        alert("Please select file and operation");
        return;
      }

      // Get parameters
      this.processingParams = this.collectProcessingParams();

      if (!this.processingParams) {
        return; // Validation failed
      }

      // Show progress
      this.showProgressSection();

      try {
        // Request processing from main.ts through preload.ts API
        const result = await (window as any).electronAPI.processVideo(
          this.selectedFile.path,
          this.processingParams,
        );

        // Call handleProcessingSuccess with successful response
        this.handleProcessingSuccess(result);
      } catch (error) {
        // Call handleProcessingError with error response
        this.handleProcessingError(error);
      }
    });
  }

  // Used in setupExecuteButton
  private collectProcessingParams(): ProcessingParams | null {
    const action = this.getActionNumber(this.selectedOperation!);
    const params: ProcessingParams = {
      action: action,
    };

    switch (this.selectedOperation) {
      case "compress":
        break;

      case "resolution":
        const resolutionSelect = document.getElementById(
          "resolutionSelect",
        ) as HTMLSelectElement;
        params.resolution = resolutionSelect.value;
        break;

      case "aspect":
        const aspectSelect = document.getElementById(
          "aspectRatio",
        ) as HTMLSelectElement;
        params.aspect_ratio = aspectSelect.value;
        break;

      case "audio":
        break;

      case "gif":
        const startTime = (
          document.getElementById("startTime") as HTMLInputElement
        ).value;
        const endTime = (document.getElementById("endTime") as HTMLInputElement)
          .value;
        const format = (
          document.getElementById("outputFormat") as HTMLSelectElement
        ).value;

        if (!startTime || !endTime) {
          alert("Please enter start time and end time");
          return null;
        }

        params.startseconds = this.timeToSeconds(startTime);
        params.endseconds = this.timeToSeconds(endTime);
        params.extension = format;

        if (params.startseconds >= params.endseconds) {
          alert("End time must be after start time");
          return null;
        }
        break;
    }

    const outputFileNameInput = document.getElementById(
      "outputFileName",
    ) as HTMLInputElement;
    const outputFileName = outputFileNameInput.value.trim();

    if (!outputFileName) {
      alert("Please enter output filename");
      return null;
    }

    params.outputFileName = outputFileName;

    return params;
  }

  // Used in collectProcessingParams
  private getActionNumber(operation: string): number {
    // Use Map to return number based on operation mode
    const actionMap: { [key: string]: number } = {
      compress: 1,
      resolution: 2,
      aspect: 3,
      audio: 4,
      gif: 5,
    };
    return actionMap[operation];
  }

  // Used in collectProcessingParams
  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // Used in setupExecuteButton
  private showProgressSection(): void {
    // Hide all other sections
    document.querySelector(".upload-section")?.classList.add("hidden");
    document.querySelector(".operation-section")?.classList.add("hidden");
    document.querySelector(".settings-section")?.classList.add("hidden");
    document.querySelector(".execute-section")?.classList.add("hidden");

    // Show progress section
    const progressSection = document.getElementById("progressSection");
    progressSection?.classList.remove("hidden");

    // Call animateProgress to start progress
    this.animateProgress();
  }

  // Used in showProgressSection
  private animateProgress(): void {
    const progressFill = document.getElementById("progressFill") as HTMLElement;
    const progressText = document.getElementById("progressText") as HTMLElement;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 90) progress = 90;

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Processing... ${Math.round(progress)}%`;
    }, 500);

    // Set ID to remove interval later
    this.progressInterval = interval;
  }

  // Used in setupExecuteButton
  private async handleProcessingSuccess(result: any): Promise<void> {
    // Called after processing is complete, so move progress bar to max
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    const progressFill = document.getElementById("progressFill") as HTMLElement;
    const progressText = document.getElementById("progressText") as HTMLElement;
    progressFill.style.width = "100%";
    progressText.textContent = "Processing complete!";

    try {
      const downloadResult = await (window as any).electronAPI.downloadFile({
        filename: result.filename,
        fileData: result.fileData,
        fileExtension: result.fileExtension,
      });

      if (downloadResult.success) {
        alert(`File saved: ${downloadResult.path}`);
        this.resetUI();
      } else {
        alert("Save operation was cancelled");
        this.resetUI();
      }
    } catch (error) {
      alert("An error occurred during save");
      this.resetUI();
    }
  }

  // Used in setupExecuteButton
  private handleProcessingError(error: any): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    console.error("Processing error:", error);
    alert(`An error occurred during processing: ${error.message || error}`);

    this.resetUI();
  }

  private resetUI(): void {
    document.querySelector(".upload-section")?.classList.remove("hidden");
    document.querySelector(".operation-section")?.classList.remove("hidden");
    document.querySelector(".execute-section")?.classList.remove("hidden");

    document.getElementById("progressSection")?.classList.add("hidden");
    document.getElementById("resultSection")?.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new VideoProcessorUI();
});