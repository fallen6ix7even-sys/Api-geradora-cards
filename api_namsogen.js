const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LOGGER - para ver todas as requisições
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    next();
});

// Rota principal - TESTE
app.get('/', (req, res) => {
    console.log('✅ Rota principal acessada!');
    res.json({
        status: "online",
        message: "🔥 API GERADORA DE CARDS - by FalleN",
        endpoints: {
            "/gerar": "POST - Enviar JSON",
            "/gerar/:bin/:mes/:ano/:cvv/:qtd": "GET - Via URL",
            "/teste": "GET - Rota de teste"
        }
    });
});

// Rota de teste simples
app.get('/teste', (req, res) => {
    res.json({ message: "Rota de teste funcionando!" });
});

// Rota POST /gerar
app.post('/gerar', async (req, res) => {
    console.log('📥 Requisição POST /gerar recebida!');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { bin, mes, ano, cvv, quantidade = 10 } = req.body;
        
        // Validações básicas
        if (!bin) {
            return res.status(400).json({ error: "BIN é obrigatório!" });
        }
        
        // SIMULAÇÃO (já que não temos acesso direto ao NamsoGen)
        const cards = [];
        for (let i = 0; i < quantidade; i++) {
            // Gera número aleatório baseado no BIN
            let numero = bin.replace(/x/gi, () => Math.floor(Math.random() * 10));
            // Completa até 16 dígitos se necessário
            while (numero.length < 16) {
                numero += Math.floor(Math.random() * 10);
            }
            
            cards.push({
                numero: numero,
                validade: `${mes.padStart(2, '0')}|${ano}`,
                cvv: cvv === 'rdm' ? Math.floor(100 + Math.random() * 900) : cvv,
                bandeira: numero.startsWith('4') ? 'VISA' : 
                         numero.startsWith('5') ? 'MASTERCARD' : 'DESCONHECIDA'
            });
        }
        
        const resultado = {
            success: true,
            fonte: "gerador_local",
            parametros: { bin, mes, ano, cvv, quantidade },
            cards: cards,
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Gerados ${cards.length} cards com sucesso!`);
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Erro no processamento:', error);
        res.status(500).json({ 
            error: "Erro interno",
            detalhes: error.message 
        });
    }
});

// Rota GET /gerar/:bin/:mes/:ano/:cvv/:qtd
app.get('/gerar/:bin/:mes/:ano/:cvv/:qtd?', async (req, res) => {
    console.log('📥 Requisição GET /gerar recebida!');
    console.log('Parâmetros:', req.params);
    
    try {
        const { bin, mes, ano, cvv, qtd = 10 } = req.params;
        const quantidade = parseInt(qtd) || 10;
        
        // Mesma lógica do POST
        const cards = [];
        for (let i = 0; i < quantidade; i++) {
            let numero = bin.replace(/x/gi, () => Math.floor(Math.random() * 10));
            while (numero.length < 16) {
                numero += Math.floor(Math.random() * 10);
            }
            
            cards.push({
                numero: numero,
                validade: `${mes.padStart(2, '0')}|${ano}`,
                cvv: cvv === 'rdm' ? Math.floor(100 + Math.random() * 900) : cvv,
                bandeira: numero.startsWith('4') ? 'VISA' : 
                         numero.startsWith('5') ? 'MASTERCARD' : 'DESCONHECIDA'
            });
        }
        
        res.json({
            success: true,
            fonte: "gerador_local_get",
            parametros: { bin, mes, ano, cvv, quantidade },
            cards: cards,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 - Rota não encontrada
app.use((req, res) => {
    console.log(`❌ 404 - Rota não encontrada: ${req.method} ${req.path}`);
    res.status(404).json({ 
        error: "Rota não encontrada",
        dica: "Use GET / para ver os endpoints disponíveis",
        path: req.path,
        method: req.method
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
║  🌐 URL: http://0.0.0.0:${PORT}      
║  🧪 Teste: /teste
║  📚 Docs: /
╚════════════════════════════════════╝
    `);
});
