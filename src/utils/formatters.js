/**
 * Safely forces any global phone number format down to its mathematical core identifier.
 * Example Formats resolved to "447123456789":
 * -> 07123 456 789 
 * -> 00447123456789
 * -> +44 7123 456 789
 * -> 447123456789
 */
export const normalizePhone = (rawPhone) => {
    if (!rawPhone || typeof rawPhone !== 'string') return '';
    
    // Step 1: Strip all non-numeric characters, except the intrinsic +
    let cleaned = rawPhone.replace(/[^0-9+]/g, '');
    
    // Step 2: Convert "00" international dial string to standard "+"
    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
    }
    
    // Step 3: Soft UK standardisation. If a UK native types "07...", attach prefix.
    // (This operates assuming 0 usually means domestic routing)
    if (cleaned.startsWith('0')) {
        cleaned = '+44' + cleaned.slice(1);
    }
    
    // Step 4: Finally rip away the + and return pure numerical sequence for SQL matching
    return cleaned.replace(/[^0-9]/g, '');
};
