const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger detalhado
app.use((req, res, next) => {
    console.log(`\n🔷 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('📦 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    console.log('📦 Query:', req.query);
    console.log('📦 Params:', req.params);
    next();
});

// Rota principal
app.get('/', (req, res) => {
    res.json({
        status: "online",
        message: "🔥 API GERADORA DE CARDS - by FalleN",
        endpoints: {
            "/gerar": "POST - Enviar JSON",
            "/gerar/:bin/:mes/:ano/:cvv/:qtd": "GET - Via URL"
        }
    });
});

// Rota POST /gerar (a que seu bot está usando)
app.post('/gerar', async (req, res) => {
    console.log('🎯 ROTA POST /gerar ACESSADA!');
    
    try {
        const { bin, mes, ano, cvv, quantidade = 10 } = req.body;
        
        console.log('📊 Dados recebidos:', { bin, mes, ano, cvv, quantidade });
        
        // Validações
        if (!bin) {
            return res.status(400).json({ 
                success: false, 
                error: "BIN é obrigatório!" 
            });
        }
        
        // SIMULADOR DE CARDS (já que não temos acesso direto ao NamsoGen)
        const cards = [];
        for (let i = 0; i < quantidade; i++) {
            // Limpa o BIN (remove caracteres especiais)
            let binLimpo = bin.replace(/[^0-9xX]/g, '').toLowerCase();
            
            // Substitui X por números aleatórios
            let numero = binLimpo.replace(/x/g, () => Math.floor(Math.random() * 10).toString());
            
            // Se o número for menor que 16 dígitos, completa
            while (numero.length < 16) {
                numero += Math.floor(Math.random() * 10).toString();
            }
            
            // Se for maior que 16, corta
            numero = numero.substring(0, 16);
            
            // Gera CVV
            let cvvGerado;
            if (cvv.toLowerCase() === 'rdm' || cvv.toLowerCase() === 'random') {
                cvvGerado = Math.floor(Math.random() * 900 + 100).toString();
                if (numero.startsWith('3')) { // Amex tem 4 dígitos
                    cvvGerado = Math.floor(Math.random() * 9000 + 1000).toString();
                }
            } else {
                cvvGerado = cvv.padStart(3, '0').substring(0, 3);
            }
            
            cards.push({
                numero: numero,
                validade: `${mes.padStart(2, '0')}|${ano}`,
                cvv: cvvGerado,
                bandeira: identificarBandeira(numero)
            });
        }
        
        const resultado = {
            success: true,
            fonte: "gerador_local_v2",
            parametros: { bin, mes, ano, cvv, quantidade: cards.length },
            cards: cards,
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Cards gerados: ${cards.length}`);
        console.log('📤 Enviando resposta:', JSON.stringify(resultado, null, 2).substring(0, 500) + '...');
        
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Função para identificar bandeira
function identificarBandeira(numero) {
    if (numero.startsWith('4')) return 'VISA';
    if (numero.startsWith('5')) return 'MASTERCARD';
    if (numero.startsWith('3')) return 'AMEX';
    if (numero.startsWith('6')) return 'DISCOVER';
    if (numero.startsWith('2')) return 'MIR';
    return 'DESCONHECIDA';
}

// Rota GET /gerar (fallback)
app.get('/gerar/:bin/:mes/:ano/:cvv/:qtd?', async (req, res) => {
    console.log('🎯 ROTA GET /gerar ACESSADA!');
    
    try {
        const { bin, mes, ano, cvv, qtd = 10 } = req.params;
        const quantidade = parseInt(qtd) || 10;
        
        // Simula o POST chamando a mesma lógica
        req.body = { bin, mes, ano, cvv, quantidade };
        return app.post('/gerar', req, res);
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Tratamento de 404
app.use((req, res) => {
    console.log(`❌ 404 - Rota não encontrada: ${req.path}`);
    res.status(404).json({ 
        success: false,
        error: "Rota não encontrada",
        path: req.path 
    });
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════╗
║    🔥 API GERADORA DE CARDS 🔥     ║
║    by: FalleN & DipSik              ║
╠════════════════════════════════════╣
║  📡 Porta: ${PORT}                       
║  🌐 URL: https://api-geradora-cards.onrender.com
║  🧪 Teste: curl -X POST https://api-geradora-card.s.onrender.com/gerar
╚════════════════════════════════════╝
    `);
});
