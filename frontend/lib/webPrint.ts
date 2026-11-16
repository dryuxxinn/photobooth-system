/**
 * Direct Silent Web Printing helper for Photobooth Kiosks
 * Uses an isolated invisible <iframe> with standard 4x6 inch borderless page setup.
 *
 * When run inside Chrome with `--kiosk --kiosk-printing`, it prints silently to the default printer.
 * When run in normal browser, it triggers standard browser print dialog for the photostrip.
 */

export interface WebPrintOptions {
  copies?: number;
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export function printImageDirect(
  imageUrl: string,
  options?: WebPrintOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !imageUrl) {
      resolve(false);
      return;
    }

    try {
      if (options?.onBeforePrint) {
        options.onBeforePrint();
      }

      // Remove existing print frames if any
      const existing = document.getElementById("dryu-print-frame");
      if (existing) {
        existing.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "dryu-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      iframe.style.pointerEvents = "none";

      document.body.appendChild(iframe);

      const frameWindow = iframe.contentWindow;
      const frameDoc = frameWindow?.document;
      if (!frameWindow || !frameDoc) {
        iframe.remove();
        resolve(false);
        return;
      }

      const copies = Math.max(1, Math.min(5, options?.copies || 1));
      const pageTitle = options?.title || "Sweet Studio Photobooth Print";

      // Render copies as multiple pages in print layout
      let pagesHtml = "";
      for (let i = 0; i < copies; i++) {
        pagesHtml += `
          <div class="print-page">
            <img src="${imageUrl}" alt="Photostrip" />
          </div>
        `;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${pageTitle}</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0mm;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              .print-page {
                page-break-after: always;
                page-break-inside: avoid;
                width: 4in;
                height: 6in;
                margin: 0 auto;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
              }
              .print-page:last-child {
                page-break-after: auto;
              }
              img {
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
                margin: 0 auto;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `);
      frameDoc.close();

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (options?.onAfterPrint) {
          options.onAfterPrint();
        }
        setTimeout(() => {
          try {
            iframe.remove();
          } catch {
            // ignore
          }
          resolve(true);
        }, 1200);
      };

      // Listen for afterprint event
      frameWindow.addEventListener("afterprint", finish);

      // Trigger print once image is loaded in iframe
      const imgElements = frameDoc.querySelectorAll("img");
      let loadedCount = 0;
      const totalImages = imgElements.length;

      const triggerPrint = () => {
        setTimeout(() => {
          try {
            frameWindow.focus();
            frameWindow.print();
          } catch {
            finish();
          }
        }, 300);
      };

      if (totalImages === 0) {
        triggerPrint();
      } else {
        imgElements.forEach((img) => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === totalImages) triggerPrint();
            };
            img.onerror = () => {
              loadedCount++;
              if (loadedCount === totalImages) triggerPrint();
            };
          }
        });
      }

      // Safety fallback timeout
      setTimeout(() => {
        finish();
      }, 10000);
    } catch {
      resolve(false);
    }
  });
}
