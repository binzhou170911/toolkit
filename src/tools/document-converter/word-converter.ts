import mammoth from 'mammoth'
import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

export interface ConversionResult {
  markdown: string
  html: string
  images: { name: string; data: string; type: string }[]
}

export async function wordToMarkdown(arrayBuffer: ArrayBuffer): Promise<ConversionResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value

    if (!html) {
      throw new Error('Failed to convert Word document')
    }

    // Extract images from HTML
    const images: { name: string; data: string; type: string }[] = []
    let processedHtml = html

    // Find all base64 images
    const imageRegex = /src="(data:image\/([^;]+);base64,([^"]+))"/g
    let match
    let imageIndex = 1

    while ((match = imageRegex.exec(html)) !== null) {
      const fullDataUrl = match[1]
      const imageType = match[2]
      const base64Data = match[3]

      // Create image name
      const imageName = `image-${imageIndex}.${imageType}`
      images.push({
        name: imageName,
        data: base64Data,
        type: imageType
      })

      // Replace base64 with relative path in HTML
      processedHtml = processedHtml.replace(fullDataUrl, `images/${imageName}`)
      imageIndex++
    }

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(processedHtml)

    return {
      markdown,
      html: processedHtml,
      images
    }
  } catch (error) {
    throw new Error(`Word to Markdown conversion failed: ${error}`)
  }
}

export async function wordToHtml(arrayBuffer: ArrayBuffer): Promise<ConversionResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value

    // Extract images
    const images: { name: string; data: string; type: string }[] = []
    const imageRegex = /src="(data:image\/([^;]+);base64,([^"]+))"/g
    let match
    let imageIndex = 1

    while ((match = imageRegex.exec(html)) !== null) {
      const imageType = match[2]
      const base64Data = match[3]
      const imageName = `image-${imageIndex}.${imageType}`
      images.push({
        name: imageName,
        data: base64Data,
        type: imageType
      })
      imageIndex++
    }

    return {
      markdown: '',
      html,
      images
    }
  } catch (error) {
    throw new Error(`Word to HTML conversion failed: ${error}`)
  }
}

export async function extractImagesFromWord(arrayBuffer: ArrayBuffer): Promise<{ name: string; data: string; type: string }[]> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value

    const images: { name: string; data: string; type: string }[] = []
    const imageRegex = /src="(data:image\/([^;]+);base64,([^"]+))"/g
    let match
    let imageIndex = 1

    while ((match = imageRegex.exec(html)) !== null) {
      const imageType = match[2]
      const base64Data = match[3]
      const imageName = `image-${imageIndex}.${imageType}`
      images.push({
        name: imageName,
        data: base64Data,
        type: imageType
      })
      imageIndex++
    }

    return images
  } catch (error) {
    throw new Error(`Image extraction failed: ${error}`)
  }
}
