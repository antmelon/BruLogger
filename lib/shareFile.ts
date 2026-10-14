import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';

// Hands a text file to the person. The website downloads it. The app writes it to its cache folder
// and opens the share sheet (Save to Files, AirDrop, Mail, Numbers...). Share is React Native's
// own and expo-file-system is already in the app, so this needs no new native code.

/** Resolves once the file is handed over: downloaded, or the share sheet closed. */
export async function shareTextFile(name: string, text: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // after the browser has started the download
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  // iOS shares the file itself; Android's share sheet only takes text
  await Share.share(Platform.OS === 'ios' ? { url: file.uri, title: name } : { message: text, title: name });
}
