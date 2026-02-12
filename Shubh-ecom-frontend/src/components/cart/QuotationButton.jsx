"use client";
import React, { useRef, useState } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
import QuotationTemplate from '@/components/invoice/QuotationTemplate';
import { Button } from '@/components/ui/button';

const QuotationButton = ({ cartItems, summary, profile }) => {
  const componentRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      
      // Open window early to avoid popup blockers and show loading state
      const win = window.open('', '_blank');
      if (win) {
          win.document.write('<html><head><title>Generating Quotation...</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div>Generating PDF...</div></body></html>');
      }

      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = componentRef.current;
      const filename = `Quotation-${new Date().toISOString().split('T')[0]}.pdf`;
      const opt = {
        margin: [10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Temporarily make visible for capture
      element.style.display = 'block';
      
      // Generate Blob URL
      const pdfBlobUrl = await html2pdf().set(opt).from(element).output('bloburl');
      element.style.display = 'none';

      // Update the opened window with the PDF in an iframe and a custom Download button
      if (win) {
        win.document.open();
        win.document.write(`
          <html>
            <head>
              <title>${filename}</title>
              <style>
                body { margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; font-family: sans-serif; background: #525659; }
                .toolbar { background: #323639; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10; }
                .filename { font-size: 14px; font-weight: 500; }
                .btn { background-color: #2663EB; color: white; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 13px; font-weight: 500; transition: background 0.2s; }
                .btn:hover { background-color: #1d4ed8; }
                iframe { flex: 1; width: 100%; border: none; }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span class="filename">${filename}</span>
                <a href="${pdfBlobUrl}" download="${filename}" class="btn">Download / Save PDF</a>
              </div>
              <iframe src="${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0" type="application/pdf"></iframe>
            </body>
          </html>
        `);
        win.document.close();
      }

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      // Optional: Close the window if error occurs
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div style={{ display: 'none' }}>
        {/* Helper wrapper to force HEX colors for html2canvas compatibility */}
        <div 
          ref={componentRef} 
          style={{
            // Force reset of theme variables to HEX to avoid 'lab'/'oklch' parsing errors in html2canvas
            '--color-background': '#ffffff',
            '--color-foreground': '#0f172a',
            '--color-card': '#ffffff',
            '--color-card-foreground': '#0f172a',
            '--color-popover': '#ffffff',
            '--color-popover-foreground': '#0f172a',
            '--color-primary': '#2663EB',
            '--color-primary-foreground': '#ffffff',
            '--color-secondary': '#f1f5f9',
            '--color-secondary-foreground': '#0f172a',
            '--color-muted': '#f1f5f9',
            '--color-muted-foreground': '#64748b',
            '--color-accent': '#f1f5f9',
            '--color-accent-foreground': '#0f172a',
            '--color-destructive': '#ef4444',
            '--color-destructive-foreground': '#ffffff',
            '--color-border': '#e2e8f0',
            '--color-input': '#e2e8f0',
            '--color-ring': '#2663EB',
            color: '#0f172a',
            backgroundColor: '#ffffff',
          }}
        >
            <QuotationTemplate 
                items={cartItems} 
                summary={summary}
                profile={profile}
            />
        </div>
      </div>
      
      <Button
        onClick={handleDownloadPdf}
        disabled={isGenerating}
        variant="outline"
        className="w-full h-12 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isGenerating ? 'Generating Quotation...' : 'Download Quotation'}
      </Button>
    </>
  );
};

export default QuotationButton;
