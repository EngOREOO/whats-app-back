/**
 * CSV Parsing and Placeholder Replacement Utilities
 */

export interface CSVRow {
  [key: string]: string;
}

export interface PlaceholderMapping {
  [placeholderKey: string]: string; // Maps placeholder key to CSV column name
}

export interface MessageTemplate {
  template: string;
  placeholders: string[];
}

export interface ProcessedMessage {
  rowIndex: number;
  phoneNumber: string;
  message: string;
  data: CSVRow;
}

/**
 * Extracts placeholder keys from a message template
 * @param template - The message template with placeholders like {{Name}}, {{Student Number}}
 * @returns Array of placeholder keys (without {{}})
 */
export function extractPlaceholders(template: string): string[] {
  const placeholderRegex = /{{\s*([^}]+?)\s*}}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const key = match[1].trim();
    if (key && !placeholders.includes(key)) {
      placeholders.push(key);
    }
  }

  return placeholders;
}

/**
 * Replaces placeholders in a message template with actual values
 * @param template - The message template
 * @param data - Object containing the values to replace placeholders with
 * @param mapping - Optional mapping from placeholder keys to data keys
 * @returns The personalized message with placeholders replaced
 */
export function renderMessage(
  template: string, 
  data: CSVRow, 
  mapping?: PlaceholderMapping
): string {
  return template.replace(/{{\s*([^}]+?)\s*}}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Use mapping if provided, otherwise use the key directly
    const dataKey = mapping ? mapping[trimmedKey] || trimmedKey : trimmedKey;
    
    // Return the value from data, or the original placeholder if not found
    return data[dataKey] || match;
  });
}

/**
 * Parses CSV content and returns array of objects
 * @param csvContent - Raw CSV content as string
 * @param hasHeaders - Whether the CSV has headers (default: true)
 * @returns Array of objects with column names as keys
 */
export function parseCSV(csvContent: string, hasHeaders: boolean = true): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }

  let headers: string[] = [];
  let dataLines: string[] = [];

  if (hasHeaders) {
    headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    dataLines = lines.slice(1);
  } else {
    // Generate default headers if none provided
    const firstLine = lines[0].split(',');
    headers = firstLine.map((_, index) => `Column${index + 1}`);
    dataLines = lines;
  }

  return dataLines
    .filter(line => line.trim() !== '')
    .map((line) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      
      return row;
    });
}

/**
 * Creates a default mapping from common placeholder names to CSV column names
 * @param headers - Array of CSV column headers
 * @returns Mapping object
 */
export function createDefaultMapping(headers: string[]): PlaceholderMapping {
  const mapping: PlaceholderMapping = {};
  
  // Common mappings
  const commonMappings = {
    'Name': ['name', 'Name', 'NAME', 'full_name', 'Full Name'],
    'Phone': ['phone', 'Phone', 'PHONE', 'phone_number', 'Phone Number', 'mobile', 'Mobile'],
    'Student Number': ['student_number', 'Student Number', 'STUDENT_NUMBER', 'std_num', 'StdNum', 'student_id'],
    'Group Name': ['group_name', 'Group Name', 'GROUP_NAME', 'group', 'Group', 'class', 'Class'],
    'Code': ['code', 'Code', 'CODE', 'access_code', 'Access Code', 'student_code'],
    'Password': ['password', 'Password', 'PASSWORD', 'pass', 'Pass']
  };

  // Find matching headers for each placeholder
  Object.entries(commonMappings).forEach(([placeholder, possibleNames]) => {
    const foundHeader = headers.find(header => 
      possibleNames.includes(header) || 
      header.toLowerCase().includes(placeholder.toLowerCase())
    );
    
    if (foundHeader) {
      mapping[placeholder] = foundHeader;
    }
  });

  return mapping;
}

/**
 * Processes a CSV file and message template to create personalized messages
 * @param csvContent - Raw CSV content
 * @param messageTemplate - Message template with placeholders
 * @param options - Processing options
 * @returns Array of processed messages
 */
export function processCSVWithTemplate(
  csvContent: string,
  messageTemplate: string,
  options: {
    hasHeaders?: boolean;
    customMapping?: PlaceholderMapping;
    phoneNumberColumn?: string;
    autoFormatPhoneNumbers?: boolean;
  } = {}
): ProcessedMessage[] {
  const {
    hasHeaders = true,
    customMapping,
    phoneNumberColumn = 'Phone',
    autoFormatPhoneNumbers = true
  } = options;

  // Parse CSV
  const rows = parseCSV(csvContent, hasHeaders);
  
  if (rows.length === 0) {
    return [];
  }

  // Extract placeholders from template
  const placeholders = extractPlaceholders(messageTemplate);
  
  if (placeholders.length === 0) {
    // No placeholders, return same message for all rows
    return rows.map((row, index) => ({
      rowIndex: index,
      phoneNumber: row[phoneNumberColumn] || '',
      message: messageTemplate,
      data: row
    }));
  }

  // Create mapping
  const headers = Object.keys(rows[0]);
  const mapping = customMapping || createDefaultMapping(headers);

  // Process each row
  return rows.map((row, index) => {
    // Format phone number if needed
    let phoneNumber = row[phoneNumberColumn] || '';
    
    if (autoFormatPhoneNumbers && phoneNumber) {
      phoneNumber = formatPhoneNumber(phoneNumber);
    }

    // Create data object with formatted phone number
    const dataWithFormattedPhone = { ...row };
    if (phoneNumberColumn in dataWithFormattedPhone) {
      dataWithFormattedPhone[phoneNumberColumn] = phoneNumber;
    }

    // Render personalized message
    const personalizedMessage = renderMessage(messageTemplate, dataWithFormattedPhone, mapping);

    return {
      rowIndex: index,
      phoneNumber,
      message: personalizedMessage,
      data: dataWithFormattedPhone
    };
  });
}

/**
 * Formats phone number to international format
 * @param phoneNumber - Raw phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.trim();
  
  // Remove any non-digit characters except +
  formatted = formatted.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add country code
  if (!formatted.startsWith('+')) {
    // Handle Egyptian numbers
    if (formatted.startsWith('0')) {
      formatted = '+20' + formatted.substring(1);
    } else if (formatted.length === 11 && formatted.startsWith('1')) {
      formatted = '+20' + formatted;
    } else {
      formatted = '+' + formatted;
    }
  }
  
  return formatted;
}

/**
 * Validates that all placeholders in template have corresponding data
 * @param template - Message template
 * @param availableKeys - Array of available data keys
 * @param mapping - Optional mapping from placeholder keys to data keys
 * @returns Array of missing placeholders
 */
export function validatePlaceholders(
  template: string,
  availableKeys: string[],
  mapping?: PlaceholderMapping
): string[] {
  const placeholders = extractPlaceholders(template);
  
  return placeholders.filter(placeholder => {
    const dataKey = mapping ? mapping[placeholder] || placeholder : placeholder;
    return !availableKeys.includes(dataKey);
  });
}

/**
 * Creates a preview of the first few processed messages
 * @param processedMessages - Array of processed messages
 * @param maxPreview - Maximum number of previews to show
 * @returns Preview messages
 */
export function createMessagePreview(
  processedMessages: ProcessedMessage[],
  maxPreview: number = 3
): ProcessedMessage[] {
  return processedMessages.slice(0, maxPreview);
} 