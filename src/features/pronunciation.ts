export const speechAvailable = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;
export function pronounce(text: string, lang: string, rate: number) {
  if (!speechAvailable()) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = speechSynthesis.getVoices().find((v) => v.lang === lang);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
  return true;
}
