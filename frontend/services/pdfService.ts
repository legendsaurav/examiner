
// We use the global `pdfjsLib` loaded via CDN in index.html to avoid complex bundler setup for the worker.
declare const pdfjsLib: any;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF Extraction failed:", error);
    throw new Error("Failed to extract text from PDF. Please ensure the file is a valid PDF.");
  }
};
