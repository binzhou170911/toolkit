## ADDED Requirements

### Requirement: Word to Markdown conversion
The system SHALL allow users to convert Word (.docx) files to Markdown format.

#### Scenario: Successful conversion
- **WHEN** user uploads a .docx file and clicks "Convert to Markdown"
- **THEN** system converts the file to Markdown format, preserving headings, lists, tables, bold, italic, and other formatting

#### Scenario: Invalid file format
- **WHEN** user uploads a .doc file
- **THEN** system shows an error message "Only .docx format is supported. Please convert your .doc file to .docx first."

#### Scenario: File too large
- **WHEN** user uploads a file larger than 10MB
- **THEN** system shows an error message "File size exceeds 10MB limit"

### Requirement: Word to HTML conversion
The system SHALL allow users to convert Word (.docx) files to HTML format.

#### Scenario: Successful conversion
- **WHEN** user uploads a .docx file and clicks "Convert to HTML"
- **THEN** system converts the file to HTML format, preserving all formatting and structure

### Requirement: PDF to Markdown conversion
The system SHALL allow users to convert PDF files to Markdown format with intelligent format recognition.

#### Scenario: Successful conversion
- **WHEN** user uploads a PDF file and clicks "Convert to Markdown"
- **THEN** system extracts text and intelligently identifies headings, paragraphs, and lists, converting to Markdown format

#### Scenario: Scanned PDF
- **WHEN** user uploads a scanned PDF (image-based)
- **THEN** system shows a warning "This appears to be a scanned PDF. Text extraction may be limited."

### Requirement: Markdown to PDF conversion
The system SHALL allow users to convert Markdown text to PDF format.

#### Scenario: Successful conversion
- **WHEN** user enters Markdown text and clicks "Convert to PDF"
- **THEN** system renders the Markdown to HTML and generates a PDF using browser print functionality

### Requirement: Markdown to Word conversion
The system SHALL allow users to convert Markdown text to Word (.docx) format.

#### Scenario: Successful conversion
- **WHEN** user enters Markdown text and clicks "Convert to Word"
- **THEN** system converts Markdown to HTML, then generates a .docx file

### Requirement: Image extraction
The system SHALL allow users to extract images from Word and PDF files.

#### Scenario: Extract images from Word
- **WHEN** user uploads a .docx file with images and clicks "Extract Images"
- **THEN** system extracts all images and provides them for download

#### Scenario: Extract images from PDF
- **WHEN** user uploads a PDF file with images and clicks "Extract Images"
- **THEN** system extracts all images and provides them for download

### Requirement: Processing progress
The system SHALL display a progress bar when processing large files.

#### Scenario: Large file processing
- **WHEN** user uploads a large file (>1MB)
- **THEN** system shows a progress bar indicating processing status

### Requirement: File size limit
The system SHALL enforce a 10MB file size limit.

#### Scenario: File within limit
- **WHEN** user uploads a file under 10MB
- **THEN** system accepts the file for processing

#### Scenario: File exceeds limit
- **WHEN** user uploads a file over 10MB
- **THEN** system rejects the file and shows an error message

### Requirement: Clipboard detection
The system SHALL detect Markdown content in clipboard and recommend the document converter tool.

#### Scenario: Markdown in clipboard
- **WHEN** user copies Markdown text (e.g., text starting with # or containing **bold**)
- **THEN** system recommends the document converter tool in clipboard recommendations
