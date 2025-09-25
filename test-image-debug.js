// Quick test to see what's happening with image URLs
const testUrl = "https://emfobsnlxploca6s.public.blob.vercel-storage.com/decks/Rider_Waite_Tarot_Deck_cover.jpg";

console.log("Test URL:", testUrl);
console.log("Starts with http:", testUrl.startsWith('http'));
console.log("Contains vercel-storage.com:", testUrl.includes('vercel-storage.com'));
console.log("Should use img tag:", testUrl.startsWith('blob:') || (testUrl.startsWith('http') && testUrl.includes('vercel-storage.com')));