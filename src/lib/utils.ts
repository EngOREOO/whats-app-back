/**
 * Replaces placeholders in a message template with actual values from data
 * @param template - The message template with placeholders like {{Name}}, {{Code}}
 * @param data - Object containing the values to replace placeholders with
 * @returns The personalized message with placeholders replaced
 */
export function renderMessage(template: string, data: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] || match; // Return original placeholder if not found
  });
}

/**
 * Creates data objects for personalized messaging
 * @param students - Array of student data
 * @returns Array of data objects with named keys
 */
export function createStudentDataObjects(
  students: Array<{
    phoneNumber: string;
    name: string;
    stdNum: string;
    groupName: string;
    code: string;
    password: string;
  }>
): Array<{ [key: string]: string }> {
  return students.map(student => {
    // Format phone number
    let formattedPhone = student.phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+20' + formattedPhone.substring(1);
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+20' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    // Create data object with named keys matching backend expectations
    return {
      Phone: formattedPhone,
      Name: student.name,
      "Student Number": student.stdNum,
      "Group Name": student.groupName,
      Code: student.code,
      Password: student.password,
    };
  });
}

/**
 * Creates personalized messages for preview purposes
 * @param messageTemplate - The message template with placeholders
 * @param students - Array of student data
 * @returns Array of personalized messages with phone numbers
 */
export function createPersonalizedMessages(
  messageTemplate: string, 
  students: Array<{
    phoneNumber: string;
    name: string;
    stdNum: string;
    groupName: string;
    code: string;
    password: string;
  }>
): Array<{ number: string; message: string }> {
  return students.map(student => {
    // Create data object for this student
    const studentData = {
      Name: student.name,
      Phone: student.phoneNumber,
      stdNum: student.stdNum,
      "Student Number": student.stdNum, // Alternative key
      "Group Name": student.groupName,
      Group: student.groupName, // Alternative key
      Code: student.code,
      Password: student.password,
    };

    // Format phone number
    let formattedPhone = student.phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+20' + formattedPhone.substring(1);
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+20' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    // Render personalized message
    const personalizedMessage = renderMessage(messageTemplate, studentData);

    return {
      number: formattedPhone,
      message: personalizedMessage,
    };
  });
}

/**
 * Validates that all placeholders in a template have corresponding data
 * @param template - The message template
 * @param availableFields - Array of available field names
 * @returns Array of missing fields
 */
export function validatePlaceholders(template: string, availableFields: string[]): string[] {
  const placeholders = template.match(/{{(.*?)}}/g) || [];
  const placeholderNames = placeholders.map(p => p.replace(/[{}]/g, '').trim());
  
  return placeholderNames.filter(placeholder => !availableFields.includes(placeholder));
} 