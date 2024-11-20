import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    startAfter,
    getDocs,
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDaxyW-kVS4FEeOomSJh2AFlzCgmCMl_xg",
    authDomain: "bdc-station.firebaseapp.com",
    projectId: "bdc-station",
    storageBucket: "bdc-station.firebasestorage.app",
    messagingSenderId: "382184889774",
    appId: "1:382184889774:web:abbb3f18a8852b14627c3f"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Referências para as coleções
const bmp280Collection = collection(firestore, 'bmp280_history');
const soundCollection = collection(firestore, 'sound_history');
const dustCollection = collection(firestore, 'dust_history');

// Elementos DOM
const tableBody = document.querySelector("#historico tbody");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const currentPageLabel = document.getElementById("currentPage");
const backToDashboardBtn = document.getElementById("backToDashboard");

// Variáveis de estado
let currentPage = 0;
let lastVisible = null;
let prevSnapshots = [];

// Formatar timestamp para DD/MM/YYYY HH:MM
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Buscar dados de uma coleção
async function fetchCollectionData(collectionRef, lastVisibleDoc = null) {
    const q = lastVisibleDoc
        ? query(collectionRef, orderBy('dateTime', 'desc'), startAfter(lastVisibleDoc), limit(10))
        : query(collectionRef, orderBy('dateTime', 'desc'), limit(10));

    const snapshot = await getDocs(q);
    return {
        data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })),
        lastVisibleDoc: snapshot.docs[snapshot.docs.length - 1],
    };
}

// Carregar página
async function loadPage(direction = 1) {
    try {
        let bmp280Data, soundData, dustData;

        if (direction === 1) { // Próxima página
            ({ data: bmp280Data, lastVisibleDoc: lastVisible } = await fetchCollectionData(bmp280Collection, lastVisible));
            ({ data: soundData } = await fetchCollectionData(soundCollection, lastVisible));
            ({ data: dustData } = await fetchCollectionData(dustCollection, lastVisible));
            prevSnapshots.push(lastVisible);
            currentPage++;
        } else if (direction === -1) { // Página anterior
            lastVisible = prevSnapshots[currentPage - 2];
            ({ data: bmp280Data } = await fetchCollectionData(bmp280Collection, lastVisible));
            ({ data: soundData } = await fetchCollectionData(soundCollection, lastVisible));
            ({ data: dustData } = await fetchCollectionData(dustCollection, lastVisible));
            currentPage--;
        }

        // Atualiza visibilidade dos botões de paginação
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = bmp280Data.length < 10;

        // Atualiza tabela
        tableBody.innerHTML = "";
        for (let i = 0; i < bmp280Data.length; i++) {
            const row = document.createElement("tr");

            const bmpReading = bmp280Data[i];
            const soundReading = soundData[i] || {};
            const dustReading = dustData[i] || {};

            row.innerHTML = `
                <td>${formatDate(bmpReading.dateTime)}</td>
                <td>${bmpReading.temperature || "N/A"}</td>
                <td>${soundReading.sound || "N/A"}</td>
                <td>${dustReading.PM10 || "N/A"}</td>
                <td>${bmpReading.weather || "Sem Chuva"}</td>
            `;
            tableBody.appendChild(row);
        }

        // Atualiza estado de paginação
        currentPageLabel.textContent = `Página ${currentPage}`;
    } catch (error) {
        console.error("Erro ao carregar página:", error);
    }
}

// Eventos de botão
prevPageBtn.addEventListener("click", () => loadPage(-1));
nextPageBtn.addEventListener("click", () => loadPage(1));
backToDashboardBtn.addEventListener("click", () => {
    window.location.href = "index.html";
});

// Inicialização
loadPage();
