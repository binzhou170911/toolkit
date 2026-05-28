import MarkdownIt from 'markdown-it'
import { Document, Packer, Paragraph, TextRun } from 'docx'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

export function markdownToHtml(markdown: string): string {
  try {
    return md.render(markdown)
  } catch (error) {
    throw new Error(`Markdown to HTML conversion failed: ${error}`)
  }
}

export async function markdownToPdf(markdown: string): Promise<void> {
  try {
    const html = markdownToHtml(markdown)

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Failed to open print window. Please allow popups.')
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Markdown to PDF</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            code {
              background: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
            }
            pre {
              background: #f4f4f4;
              padding: 16px;
              border-radius: 4px;
              overflow-x: auto;
            }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 0;
              padding-left: 16px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f4f4f4;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)

    printWindow.document.close()

    // Wait for content to load
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  } catch (error) {
    throw new Error(`Markdown to PDF conversion failed: ${error}`)
  }
}

export async function markdownToWord(markdown: string): Promise<Blob> {
  try {
    const html = markdownToHtml(markdown)

    // Parse HTML and create Word document
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const paragraphs: Paragraph[] = []

    // Process each element
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(text)]
            })
          )
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const tagName = element.tagName.toLowerCase()

        if (tagName === 'h1') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: element.textContent || '', bold: true, size: 32 })],
              heading: 'Heading1'
            })
          )
        } else if (tagName === 'h2') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: element.textContent || '', bold: true, size: 28 })],
              heading: 'Heading2'
            })
          )
        } else if (tagName === 'h3') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: element.textContent || '', bold: true, size: 24 })],
              heading: 'Heading3'
            })
          )
        } else if (tagName === 'p') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(element.textContent || '')]
            })
          )
        } else if (tagName === 'ul' || tagName === 'ol') {
          const items = element.querySelectorAll('li')
          items.forEach((item, index) => {
            const prefix = tagName === 'ol' ? `${index + 1}. ` : '• '
            paragraphs.push(
              new Paragraph({
                children: [new TextRun(prefix + item.textContent)]
              })
            )
          })
        } else if (tagName === 'pre') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: element.textContent || '', font: 'Courier New' })]
            })
          )
        }
      }
    }

    doc.body.childNodes.forEach(processNode)

    const wordDoc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const buffer = await Packer.toBlob(wordDoc)
    return buffer
  } catch (error) {
    throw new Error(`Markdown to Word conversion failed: ${error}`)
  }
}
