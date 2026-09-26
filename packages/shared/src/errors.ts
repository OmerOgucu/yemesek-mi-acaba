/** Public error text for the HTTP envelope. Domain rules keep their own sentences. */
export const ApiErrorMessage = {
  invalidBody: 'Gönderilen bilgiler geçersiz.',
  requestFailed: 'İstek tamamlanamadı.',
  fileMissing: 'Dosya bulunamadı.',
  fileTooLarge: 'Her dosya en fazla 5 MB olabilir.',
  tooManyFiles: 'En fazla 3 fotoğraf ve 1 fiş yükleyebilirsin.',
  uploadFailed: 'Dosya yüklenemedi.',
  databaseDown: 'Veritabanına bağlanılamadı.',
  schemaOutOfDate: 'Veritabanı şeması güncel değil.',
  unexpected: 'Bir şeyler karıştı. Biraz sonra tekrar dene.',
} as const;
