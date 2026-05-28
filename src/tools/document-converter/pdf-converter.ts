import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function pdfToText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }

    return fullText.trim()
  } catch (error) {
    throw new Error(`PDF text extraction failed: ${error}`)
  }
}

export async function pdfToMarkdown(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let markdown = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      // Group text by lines (based on y position)
      const lines: { text: string; y: number; height: number }[] = []
      let currentLine = { text: '', y: 0, height: 0 }

      for (const item of textContent.items) {
        const textItem = item as any
        if (textItem.str) {
          const y = textItem.transform[5]
          const height = textItem.transform[3]

          // If y position changes significantly, it's a new line
          if (Math.abs(y - currentLine.y) > 5) {
            if (currentLine.text) {
              lines.push({ ...currentLine })
            }
            currentLine = { text: textItem.str, y, height }
          } else {
            currentLine.text += textItem.str
          }
        }
      }
      if (currentLine.text) {
        lines.push(currentLine)
      }

      // Convert lines to markdown
      for (const line of lines) {
        const trimmedText = line.text.trim()
        if (!trimmedText) continue

        // Detect headings based on font size
        if (line.height > 20) {
          markdown += `# ${trimmedText}\n\n`
        } else if (line.height > 16) {
          markdown += `## ${trimmedText}\n\n`
        } else if (line.height > 14) {
          markdown += `### ${trimmedText}\n\n`
        } else {
          // Detect lists
          if (trimmedText.startsWith('•') || trimmedText.startsWith('-') || trimmedText.startsWith('*')) {
            markdown += `${trimmedText}\n`
          } else if (/^\d+\./.test(trimmedText)) {
            markdown += `${trimmedText}\n`
          } else {
            markdown += `${trimmedText}\n\n`
          }
        }
      }

      if (i < pdf.numPages) {
        markdown += '---\n\n'
      }
    }

    return markdown.trim()
  } catch (error) {
    throw new Error(`PDF to Markdown conversion failed: ${error}`)
  }
}

export async function extractImagesFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const images: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const operatorList = await page.getOperatorList()

      // Find image operators
      for (let j = 0; j < operatorList.fnArray.length; j++) {
        if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
          // Image found - in a real implementation, we would extract the image data
          // For now, we'll note that an image exists
          images.push(`Image found on page ${i}`)
        }
      }
    }

    return images
  } catch (error) {
    throw new Error(`PDF image extraction failed: ${error}`)
  }
}
