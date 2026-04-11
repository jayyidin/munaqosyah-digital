// --- App Settings ---
let appSettings = {
    appName: "",
    schoolName: "",
    theme: "light",
    logoUrl: null,
    registrationToken: null,
    examDates: [], // Array of exam dates
    kkm: 7
};

let progressDonutChart, avgBarChart; // For Chart.js instances

let currentUser = { name: 'Pengguna', role: 'Tidak Dikenal' };
let dashboardStats = {}; // To cache dashboard calculations
let isAppInitialized = false; // Penanda agar UI hanya diinisialisasi sekali
