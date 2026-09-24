/**
 * Aplikasi: RPM SD Generator
 * Platform: berguru.id ("Teman Setia Guru, Murid, dan Orang Tua")
 * Deskripsi: Backend server-side untuk otentikasi pengguna, manajemen database spreadsheet,
 *            dan penyusunan Rencana Pelaksanaan Pembelajaran (RPM) Kurikulum Merdeka 
 *            berbasis Deep Learning.
 */

// Konfigurasi Database Spreadsheet
const SPREADSHEET_NAME = "DB_RPM_SD_Generator";
const ADMIN_USERNAME = "berguruid.official@gmail.com";
const ADMIN_TOKEN = "ber21";

/**
 * Fungsi utama untuk memuat halaman web HTML
 */
function doGet() {
  initDatabase();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RPM SD Generator - berguru.id')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inisialisasi Database Spreadsheet jika belum tersedia
 */
function initDatabase() {
  let ss = getSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  }
  
  let sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('Users');
    // Header Database
    sheetUsers.appendRow([
      'Tanggal Terdaftar',
      'Email Pribadi',
      'Username (@berguru.id)',
      'Token Akses',
      'Status',
      'Nama Guru',
      'Nama Sekolah'
    ]);
    sheetUsers.getRange("A1:G1").setFontWeight("bold").setBackground("#11009e").setFontColor("#ffffff");
  }
}

/**
 * Mendapatkan objek Spreadsheet database
 */
function getSpreadsheet() {
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  return null;
}

/**
 * Menghasilkan Token Akses 5 Digit Kombinasi Alfanumerik
 */
function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 5; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Pendaftaran Akun Pengguna Baru
 * Syarat: 1 Email pribadi hanya bisa mendaftar 1 kali.
 * Menghasilkan Username otomatis berakhiran @berguru.id dan Token Akses 5 Digit.
 */
function registerUser(emailInput) {
  initDatabase();
  const email = (emailInput || '').toString().trim().toLowerCase();
  
  if (!email || email.indexOf('@') === -1) {
    return { success: false, message: 'Harap masukkan alamat email pribadi yang valid.' };
  }
  
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  // Periksa apakah email sudah pernah terdaftar
  for (let i = 1; i < data.length; i++) {
    const existingEmail = (data[i][1] || '').toString().trim().toLowerCase();
    if (existingEmail === email) {
      return { 
        success: false, 
        message: 'Email ini sudah terdaftar dalam sistem. Setiap email hanya diizinkan memiliki 1 username. Silakan gunakan token Anda untuk login atau hubungi admin jika lupa token.' 
      };
    }
  }
  
  // Format Username: [nama_depan]@berguru.id
  const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  let generatedUsername = emailPrefix + '@berguru.id';
  
  // Memastikan keunikan username
  let counter = 1;
  let isUnique = false;
  while (!isUnique) {
    let duplicate = false;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][2] || '').toString().trim().toLowerCase() === generatedUsername) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) {
      generatedUsername = emailPrefix + counter + '@berguru.id';
      counter++;
    } else {
      isUnique = true;
    }
  }
  
  const token = generateToken();
  const registrationDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  // Simpan ke spreadsheet database
  sheet.appendRow([
    registrationDate,
    email,
    generatedUsername,
    token,
    'Aktif',
    '', // Nama Guru (Diisi via pop-up profil)
    ''  // Nama Sekolah (Diisi via pop-up profil)
  ]);
  
  return {
    success: true,
    message: 'Pendaftaran berhasil!',
    username: generatedUsername,
    token: token
  };
}

/**
 * Autentikasi Pengguna & Admin Ketat Terhadap Database
 */
function loginUser(usernameInput, tokenInput) {
  initDatabase();
  const username = (usernameInput || '').toString().trim().toLowerCase();
  const token = (tokenInput || '').toString().trim();
  
  // 1. Cek Kredensial Admin
  if (username === ADMIN_USERNAME.toLowerCase() && token === ADMIN_TOKEN) {
    return {
      success: true,
      role: 'admin',
      username: ADMIN_USERNAME,
      message: 'Selamat datang, Administrator!'
    };
  }
  
  // Validasi format Username wajib berakhiran @berguru.id
  if (!username.endsWith('@berguru.id')) {
    return {
      success: false,
      message: 'Gagal Masuk! Username harus berakhiran @berguru.id yang Anda dapatkan saat mendaftar.'
    };
  }
  
  // 2. Pencocokan Pengguna di Database Spreadsheet
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const dbUsername = (data[i][2] || '').toString().trim().toLowerCase();
    const dbToken = (data[i][3] || '').toString().trim();
    const dbStatus = (data[i][4] || '').toString().trim();
    
    if (dbUsername === username && dbToken === token) {
      if (dbStatus.toLowerCase() === 'nonaktif') {
        return {
          success: false,
          message: 'Akun Anda dinonaktifkan oleh Admin. Silakan hubungi admin di berguruid.official@gmail.com.'
        };
      }
      
      return {
        success: true,
        role: 'user',
        username: dbUsername,
        namaGuru: data[i][5] || '',
        namaSekolah: data[i][6] || '',
        message: 'Berhasil masuk ke aplikasi!'
      };
    }
  }
  
  return {
    success: false,
    message: 'Gagal Masuk! Username atau Token Akses tidak terdaftar dalam database panel admin. Jika mengalami kendala, hubungi admin berguru.id.'
  };
}

/**
 * Memperbarui Profil Pengguna (Nama Guru & Nama Sekolah)
 */
function saveUserProfile(usernameInput, namaGuru, namaSekolah) {
  const username = (usernameInput || '').toString().trim().toLowerCase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if ((data[i][2] || '').toString().trim().toLowerCase() === username) {
      sheet.getRange(i + 1, 6).setValue(namaGuru);
      sheet.getRange(i + 1, 7).setValue(namaSekolah);
      return { success: true, message: 'Profil pengguna berhasil disimpan.' };
    }
  }
  
  return { success: false, message: 'Pengguna tidak ditemukan.' };
}

/**
 * Mengambil Seluruh Data Pengguna untuk Dashboard Admin
 */
function getAdminDashboardData(adminUsername, adminToken) {
  if (adminUsername !== ADMIN_USERNAME || adminToken !== ADMIN_TOKEN) {
    return { success: false, message: 'Akses Ditolak!' };
  }
  
  initDatabase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  const usersList = [];
  for (let i = 1; i < data.length; i++) {
    usersList.push({
      rowIndex: i + 1,
      noUrut: i,
      tglTerdaftar: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
      email: data[i][1] || '-',
      username: data[i][2] || '-',
      token: data[i][3] || '-',
      status: data[i][4] || 'Aktif',
      namaGuru: data[i][5] || 'Belum diisi',
      namaSekolah: data[i][6] || 'Belum diisi'
    });
  }
  
  return {
    success: true,
    users: usersList
  };
}

/**
 * Fungsi Admin: Mengedit Data Akun Pengguna
 */
function adminUpdateUser(adminUsername, adminToken, rowIndex, status, namaGuru, namaSekolah) {
  if (adminUsername !== ADMIN_USERNAME || adminToken !== ADMIN_TOKEN) {
    return { success: false, message: 'Akses Ditolak!' };
  }
  
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  
  sheet.getRange(rowIndex, 5).setValue(status);
  sheet.getRange(rowIndex, 6).setValue(namaGuru);
  sheet.getRange(rowIndex, 7).setValue(namaSekolah);
  
  return { success: true, message: 'Data pengguna berhasil diperbarui.' };
}

/**
 * Fungsi Admin: Menghapus Akun Pengguna dari Database
 */
function adminDeleteUser(adminUsername, adminToken, rowIndex) {
  if (adminUsername !== ADMIN_USERNAME || adminToken !== ADMIN_TOKEN) {
    return { success: false, message: 'Akses Ditolak!' };
  }
  
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Akun pengguna berhasil dihapus dari database.' };
}

/**
 * Generator Struktur Isi Dokumen RPM Kurikulum Merdeka (Deep Learning)
 */
function generateRPMContent(formData) {
  const {
    instansi,
    namaGuru,
    nipGuru,
    namaKepala,
    nipKepala,
    fase,
    kelas,
    mapel,
    topik,
    alokasiWaktu,
    cpAcuan
  } = formData;

  // Penentuan Regulasi Acuan CP
  let acuanCPText = "";
  if (mapel === "Pendidikan Agama dan Budi Pekerti (PAI)") {
    acuanCPText = "Keputusan Kepala Badan Kebijakan Pendidikan Dasar dan Menengah (BKPDM) Nomor 020 Tahun 2026";
  } else {
    acuanCPText = "Keputusan Kepala BSKAP Nomor 046/H/KR/2025";
  }

  return {
    success: true,
    data: {
      instansi: instansi,
      namaGuru: namaGuru,
      nipGuru: nipGuru || '-',
      namaKepala: namaKepala,
      nipKepala: nipKepala || '-',
      fase: fase,
      kelas: kelas,
      mapel: mapel,
      topik: topik,
      alokasiWaktu: alokasiWaktu || '2 x 35 Menit (1 Pertemuan)',
      acuanCP: acuanCPText,
      referensiBuku: "https://buku.kemendikdasmen.go.id/"
    }
  };
}
