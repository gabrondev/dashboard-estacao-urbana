// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    addDoc,
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";
import {
    getDatabase,
    ref,
    get,
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-database.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDaxyW-kVS4FEeOomSJh2AFlzCgmCMl_xg",
    authDomain: "bdc-station.firebaseapp.com",
    projectId: "bdc-station",
    storageBucket: "bdc-station.firebasestorage.app",
    messagingSenderId: "382184889774",
    appId: "1:382184889774:web:abbb3f18a8852b14627c3f"
  };

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const database = getDatabase(app);

// Função para atualizar o relógio
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    document.getElementById(
        "clock"
    ).textContent = `${hours}:${minutes}:${seconds}`;
}

// Atualiza o relógio a cada segundo
setInterval(updateClock, 1000);
updateClock();

// Função para verificar o status (offline/online)
async function checkDeviceStatus() {
    const now = Date.now(); // Obtém o horário atual em milissegundos
    const oneMinuteInMillis = 60 * 1000; // 1 minuto em milissegundos

    try {
        // Consultar o último documento na coleção bmp280_history
        const q = query(
            collection(firestore, "bmp280_history"),
            orderBy("dateTime", "desc"),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            let dateTime = data.dateTime;

            // Ajusta o dateTime para milissegundos, caso esteja em segundos
            if (dateTime.toString().length === 10) { 
                // Se o dateTime estiver em segundos (10 dígitos)
                dateTime *= 1000; // Converte para milissegundos
            }

            // Verifica a diferença em milissegundos
            const timeDifference = now - dateTime;

            // Converte a diferença para minutos
            const timeDifferenceInMinutes = timeDifference / (60 * 1000);

            console.log("Hora atual (em ms):", now);
            console.log("dataTime (em ms):", dateTime);
            console.log("Diferença em milissegundos:", timeDifference);
            console.log("Diferença em minutos:", timeDifferenceInMinutes);

            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            const statusCircle = document.getElementById('statusCircle');

            if (timeDifference > oneMinuteInMillis) {
                // Exibe status offline
                statusCircle.style.backgroundColor = 'red';
                statusText.textContent = 'Offline';
            } else {
                // Exibe status online
                statusCircle.style.backgroundColor = 'green';
                statusText.textContent = 'Online';
            }
        } else {
            console.log("Nenhum documento encontrado");
        }
    } catch (error) {
        console.error("Erro ao consultar o Firestore:", error);
    }
}

function updateSoundLevel(volume) {
    const bars = document.querySelectorAll("#soundLevelBars .sound-bar");
    let filledBars = Math.ceil((volume / 100) * bars.length);

    bars.forEach((bar, index) => {
        if (index < filledBars) {
            bar.style.height = `${20 + index * 10}%`;
            bar.style.backgroundColor =
                volume > 70 ? "red" : volume > 40 ? "orange" : "lightgreen";
        } else {
            bar.style.height = "10%";
            bar.style.backgroundColor = "lightgray";
        }
    });

    // Elemento de status do som e ícone correspondente
    const soundStatus = document.getElementById("soundStatus");
    let iconClass = "";
    let description = "";

    // Define o texto e o ícone correspondente ao nível de volume
    if (volume > 70) {
        description = "Alto";
        soundStatus.className = "sound-high";
        iconClass = "fas fa-volume-up";
    } else if (volume > 40) {
        description = "Médio";
        soundStatus.className = "sound-medium";
        iconClass = "fas fa-volume-down";
    } else {
        description = "Baixo";
        soundStatus.className = "sound-low";
        iconClass = "fas fa-volume-mute";
    }

    // Atualiza o ícone de volume e o texto completo com valor de volume e descrição
    soundStatus.innerHTML = `<i class="${iconClass}"></i> ${volume} dB (${description})`;
}

// Função para buscar dados em tempo real de temperatura, status de chuva, nível de som e poeira
function fetchRealtimeData() {
    // Obtém referência à raiz do Realtime Database
    const rootRef = ref(database);

    // Obtém dados em tempo real do Realtime Database
    get(rootRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val(); // Pega os dados do snapshot

                // Atualizando a temperatura
                const temperatureString = data.bmp280_readings.temperature; // Pega a temperatura
                const temperature = parseInt(temperatureString); // Converte para número
                const temperatureElement = document.getElementById("currentTemperature");
                temperatureElement.textContent = `${temperature}°C`;

                const temperatureCircle = document.querySelector(".temperature-circle");
                const temperatureIcon = document.getElementById("temperatureIcon");

                // Define classes e ícones dependendo da temperatura
                if (temperature >= 27) {
                    temperatureCircle.className = "temperature-circle temperature-hot";
                    temperatureIcon.className = "fas fa-sun";
                } else if (temperature >= 20) {
                    temperatureCircle.className = "temperature-circle temperature-warm";
                    temperatureIcon.className = "fas fa-cloud-sun";
                } else if (temperature > 10) {
                    temperatureCircle.className = "temperature-circle temperature-cool";
                    temperatureIcon.className = "fas fa-cloud";
                } else {
                    temperatureCircle.className = "temperature-circle temperature-cold";
                    temperatureIcon.className = "fas fa-snowflake";
                }

                // Atualizando o status de chuva
                const chuvaWidget = document.getElementById("chuva");
                const chuvaStatusElement = document.getElementById("chuvaStatus");

                if (data.rain_status && data.rain_status.isRaining) {
                    chuvaStatusElement.innerHTML = `<i class="fas fa-cloud-showers-heavy"></i> Chovendo`;
                    chuvaWidget.classList.add("rainy");
                    chuvaWidget.classList.remove("no-rain");
                } else {
                    chuvaStatusElement.innerHTML = `<i class="fas fa-cloud"></i> Sem chuva`;
                    chuvaWidget.classList.add("no-rain");
                    chuvaWidget.classList.remove("rainy");
                }

                // Atualizando o nível de som
                const soundLevel = parseInt(data.sound_readings.decibels.replace("dB", "").trim(), 10);
                updateSoundLevel(soundLevel); // Função que atualiza ícone e cor do som

                // Atualizando a leitura de poeira (dust_readings)
                const poeiraElement = document.getElementById("poeira");

                if (data.dust_readings) {
                    const pm10 = data.dust_readings.PM10 || "N/A";
                    const pm25 = data.dust_readings.PM25 || "N/A";
                    poeiraElement.innerHTML = `PM10: ${pm10}<br>PM2.5: ${pm25}`; // Exibe os valores em linhas separadas
                } else {
                    poeiraElement.textContent = "Leitura de poeira não disponível";
                }
            } else {
                console.log("No data available");
            }
        })
        .catch(console.error); // Tratar erro de requisição
}




// Função para converter Unix time para formato DD/MM/YYYY HH:MM
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000); // Multiplica por 1000 para converter de segundos para milissegundos
    const day = String(date.getDate()).padStart(2, '0'); // Dia com 2 dígitos
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês com 2 dígitos (getMonth() começa do 0)
    const year = date.getFullYear(); // Ano com 4 dígitos
    const hours = String(date.getHours()).padStart(2, '0'); // Hora com 2 dígitos
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Minuto com 2 dígitos
    
    // Retorna a data formatada
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Função para buscar as últimas 5 leituras das coleções e exibir no widget
async function getLastReadings() {
    try {
        // Referências para as coleções do Firestore
        const bmp280Collection = collection(firestore, 'bmp280_history');
        const dustCollection = collection(firestore, 'dust_history');
        const soundCollection = collection(firestore, 'sound_history');

        // Consultas para buscar as 5 últimas leituras de cada coleção
        const bmp280Query = query(bmp280Collection, orderBy('dateTime', 'desc'), limit(4));
        const dustQuery = query(dustCollection, orderBy('dateTime', 'desc'), limit(4));
        const soundQuery = query(soundCollection, orderBy('dateTime', 'desc'), limit(4));

        // Obtenção dos dados
        const bmp280Snapshot = await getDocs(bmp280Query);
        const dustSnapshot = await getDocs(dustQuery);
        const soundSnapshot = await getDocs(soundQuery);

        // Processando as leituras
        const bmp280Readings = bmp280Snapshot.docs.map(doc => doc.data());
        const dustReadings = dustSnapshot.docs.map(doc => doc.data());
        const soundReadings = soundSnapshot.docs.map(doc => doc.data());

        // Atualizando o widget com as últimas leituras
        const tableBody = document.querySelector("#historico tbody");

        // Limpa a tabela antes de adicionar as novas leituras
        tableBody.innerHTML = "";

        // Adiciona cada leitura na tabela
        for (let i = 0; i < 4; i++) {
            const row = document.createElement("tr");
            
            const dateCell = document.createElement("td");
            const temperatureCell = document.createElement("td");
            const soundCell = document.createElement("td");
            const airQualityCell = document.createElement("td");
            const weatherCell = document.createElement("td");

            // Obtém os timestamps de cada leitura, caso exista
            const timestamp = bmp280Readings[i]?.dateTime || dustReadings[i]?.dateTime || soundReadings[i]?.dateTime;
            const temperature = bmp280Readings[i]?.temperature || "N/A";
            const soundLevel = soundReadings[i]?.sound || "N/A";
            const airQuality = dustReadings[i]?.PM10 || "N/A";
            const weather = "Sem Chuva";  // Ou obtenha esse dado conforme a sua implementação de clima

            // Formata a data utilizando a função formatDate
            const formattedDate = timestamp ? formatDate(timestamp) : "Indisponível";

            // Preenche as células da linha
            dateCell.textContent = formattedDate;
            temperatureCell.textContent = `${temperature}`;
            soundCell.textContent = `${soundLevel}`;
            airQualityCell.textContent = airQuality;
            weatherCell.textContent = weather;

            // Adiciona as células na linha
            row.appendChild(dateCell);
            row.appendChild(temperatureCell);
            row.appendChild(soundCell);
            row.appendChild(airQualityCell);
            row.appendChild(weatherCell);

            // Adiciona a linha na tabela
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error("Erro ao buscar as últimas leituras:", error);
    }
}

// Redirecionamento para a página de histórico completo
document.getElementById("verHistorico").addEventListener("click", () => {
    window.location.href = "history.html";
});

// Função para obter os dados e renderizar o gráfico de linhas
async function getTemperatureData() {
    try {
        // Referência para a coleção de leituras de temperatura
        const bmp280Collection = collection(firestore, 'bmp280_history');

        // Consultas para buscar as últimas 30 leituras
        const bmp280Query = query(bmp280Collection, orderBy('dateTime', 'desc'), limit(30));

        // Obtenção dos dados
        const bmp280Snapshot = await getDocs(bmp280Query);

        if (!bmp280Snapshot.empty) {
            const temperatureReadings = bmp280Snapshot.docs.map(doc => doc.data());

            // Arrays para armazenar os dados do gráfico
            const labels = []; // Labels para o eixo X (datas formatadas)
            const temperatures = []; // Temperaturas para o eixo Y

            // Preenchendo os dados para o gráfico
            temperatureReadings.forEach(data => {
                // Obtenção da data e temperatura, com tratamento correto
                const timestamp = data.dateTime; // Unix timestamp
                const formattedDate = formatDate(timestamp); // Função para formatar a data
                const temperature = parseInt(data.temperature.replace(" ºC", "")); // Corrige para número inteiro

                labels.push(formattedDate);
                temperatures.push(temperature);
            });

            // Criando o gráfico de linhas
            const ctx = document.getElementById('myTemperatureChart').getContext('2d');
            new Chart(ctx, {
                type: 'line', // Tipo de gráfico de linha
                data: {
                    labels: labels, // Labels do eixo X
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: temperatures, // Dados de temperatura
                        borderColor: 'rgba(75, 192, 192, 1)', // Cor da linha
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Cor de fundo (transparente)
                        borderWidth: 2, // Espessura da linha
                        tension: 0.4, // Suaviza a linha para um efeito mais curvado
                        fill: false // Não preenche a área abaixo da linha
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Data'
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Temperatura (°C)'
                            },
                            beginAtZero: false
                        }
                    }
                }
            });
        } else {
            console.log("Nenhuma leitura de temperatura encontrada.");
        }
    } catch (error) {
        console.error("Erro ao buscar as leituras de temperatura:", error);
    }
}

// Função para obter os dados de som e renderizar o gráfico de linhas
async function getSoundData() {
    try {
        // Referência para a coleção de leituras de som
        const soundCollection = collection(firestore, 'sound_history');

        // Consultas para buscar as últimas 30 leituras de som
        const soundQuery = query(soundCollection, orderBy('dateTime', 'desc'), limit(30));

        // Obtenção dos dados
        const soundSnapshot = await getDocs(soundQuery);

        if (!soundSnapshot.empty) {
            const soundReadings = soundSnapshot.docs.map(doc => doc.data());

            // Arrays para armazenar os dados do gráfico
            const labels = []; // Labels para o eixo X (datas formatadas)
            const soundLevels = []; // Níveis de som para o eixo Y

            // Preenchendo os dados para o gráfico
            soundReadings.forEach(data => {
                // Obtenção da data e nível de som, com tratamento correto
                const timestamp = data.dateTime; // Unix timestamp
                const formattedDate = formatDate(timestamp); // Função para formatar a data
                const sound = parseInt(data.sound); // Nível de som (supondo que seja um número inteiro)

                labels.push(formattedDate);
                soundLevels.push(sound);
            });

            // Criando o gráfico de linhas para a variação do som
            const ctx = document.getElementById('mySoundChart').getContext('2d');
            new Chart(ctx, {
                type: 'line', // Tipo de gráfico de linha
                data: {
                    labels: labels, // Labels do eixo X (datas)
                    datasets: [{
                        label: 'Nível de Som (dB)',
                        data: soundLevels, // Dados de nível de som
                        borderColor: 'rgba(255, 99, 132, 1)', // Cor da linha
                        backgroundColor: 'rgba(255, 99, 132, 0.2)', // Cor de fundo (transparente)
                        borderWidth: 2, // Espessura da linha
                        tension: 0.4, // Suaviza a linha para um efeito mais curvado
                        fill: false // Não preenche a área abaixo da linha
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Data'
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Nível de Som (dB)'
                            },
                            beginAtZero: false
                        }
                    }
                }
            });
        } else {
            console.log("Nenhuma leitura de som encontrada.");
        }
    } catch (error) {
        console.error("Erro ao buscar as leituras de som:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const helpButton = document.getElementById("helpButton");
    const tooltip = document.getElementById("tooltip");

    // Alterna exibição do tooltip ao clicar/tocar no botão
    helpButton.addEventListener("click", (event) => {
        event.stopPropagation(); // Impede que o evento se propague
        tooltip.style.display = tooltip.style.display === "block" ? "none" : "block";
    });

    // Fecha o tooltip ao clicar fora
    document.addEventListener("click", (event) => {
        if (!helpButton.contains(event.target) && !tooltip.contains(event.target)) {
            tooltip.style.display = "none";
        }
    });

    // Fecha o tooltip ao redimensionar a janela
    window.addEventListener("resize", () => {
        tooltip.style.display = "none";
    });
});

// Certifique-se de definir a referência da coleção aqui
const feedbackCollection = collection(firestore, "feedback");

// Referências aos elementos do DOM
const feedbackList = document.getElementById("feedbackList");
const feedbackInput = document.getElementById("feedbackInput");
const submitFeedback = document.getElementById("submitFeedback");

// Função para carregar os últimos 5 feedbacks
async function loadFeedback() {
    feedbackList.innerHTML = "Carregando..."; // Mostra um indicador de carregamento
    const feedbackQuery = query(feedbackCollection, orderBy("timestamp", "desc"), limit(2));

    try {
        const querySnapshot = await getDocs(feedbackQuery);
        feedbackList.innerHTML = ""; // Limpa o indicador
        querySnapshot.forEach((doc) => {
            const feedback = doc.data();
            const listItem = document.createElement("li");
            listItem.textContent = feedback.text || "Sem conteúdo";
            feedbackList.appendChild(listItem);
        });

        if (querySnapshot.empty) {
            feedbackList.innerHTML = "<li>Nenhum feedback encontrado</li>";
        }
    } catch (error) {
        console.error("Erro ao carregar feedbacks:", error);
        feedbackList.innerHTML = "<li>Erro ao carregar feedbacks</li>";
    }
}

// Função para salvar um novo feedback
async function submitUserFeedback() {
    const text = feedbackInput.value.trim();
    if (!text) {
        alert("Por favor, escreva um feedback antes de enviar.");
        return;
    }

    try {
        await addDoc(feedbackCollection, {
            text,
            timestamp: new Date().toISOString(), // Inclui a data e hora
        });
        feedbackInput.value = ""; // Limpa o campo de entrada
        loadFeedback(); // Recarrega a lista de feedbacks
    } catch (error) {
        console.error("Erro ao enviar feedback:", error);
        alert("Erro ao enviar feedback. Tente novamente mais tarde.");
    }
}

// Eventos
submitFeedback.addEventListener("click", submitUserFeedback);

// Carrega os feedbacks ao iniciar
window.onload = loadFeedback;

// Chama a função para exibir as últimas 30 leituras de temperatura ao carregar a página
window.onload = async () => {
    await getLastReadings();
    await getTemperatureData();
    await fetchRealtimeData();
    await getSoundData();
    await loadFeedback();
};

// Aguarde o DOM estar completamente carregado antes de chamar a função
document.addEventListener('DOMContentLoaded', () => {
    checkDeviceStatus();
});