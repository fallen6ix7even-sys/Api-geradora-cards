const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rate limiting - para não sobrecarregar o site alvo
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 requisições por IP
    message: { error: "Muitas requisições. Aguarde um momento, vilão." }
});
app.use('/gerar', limiter);

// Logger vilanesco
app.use((req, res, next) => {
    console.log(`🦹 [${new Date().toISOString()}] ${req.ip} - ${req.method} ${req.path}`);
    next();
});

// Rota principal
app.get('/', (req, res) => {
    res.json({
        nome: "🔥 API GERADORA DE CARDS - by FalleN & DipSik",
        status: "online",
        modo: "VILÃO ATIVADO",
        endpoints: {
            "/gerar": "POST - Gera cards (formato JSON)",
            "/gerar/:bin/:mes/:ano/:cvv/:qtd": "GET - Gera cards via URL",
            "/docs": "Documentação interativa"
        },
        exemplo_post: {
            bin: "54146507486xxxxx",
            mes: "03",
            ano: "2026",
            cvv: "rdm",
            quantidade: 10
        },
        exemplo_get: "/gerar/54146507486xxxxx/03/2026/rdm/10",
        aviso: "Apenas para testes! Não use para fins ilegais."
    });
});

// Função para gerar cards via requisição ao NamsoGen
async function gerarCardsNamsoGen(bin, mes, ano, cvv, quantidade) {
    try {
        // Converte parâmetros para o formato que o site espera
        const binLimpo = bin.replace(/[^0-9xX]/g, '').toLowerCase();
        
        // Monta payload igual ao que o site envia
        const payload = new URLSearchParams();
        payload.append('bin', binLimpo);
        payload.append('mes', mes);
        payload.append('ano', ano);
        payload.append('cvv', cvv);
        payload.append('quantidade', quantidade);
        
        console.log(`📡 Enviando para NamsoGen:`, payload.toString());

        // Faz a requisição para o site (simulando um navegador)
        const response = await axios.post('https://namso-gen.com/gen.php', payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://namso-gen.com',
                'Referer': 'https://namso-gen.com/?tab=advance&network=random',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });

        // Processa a resposta
        if (response.data && response.data.cards) {
            return {
                success: true,
                fonte: "NamsoGen",
                parametros: { bin: binLimpo, mes, ano, cvv, quantidade },
                cards: response.data.cards,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: "Resposta inesperada do servidor",
                dados_brutos: response.data
            };
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
        
        // Fallback: gerador local usando algoritmo Luhn (caso o site falhe)
        return gerarCardsLocal(binLimpo, mes, ano, cvv, quantidade);
    }
}

// Gerador local de fallback (usando algoritmo Luhn)
function gerarCardsLocal(bin, mes, ano, cvv, quantidade) {
    const cards = [];
    
    // Função para calcular dígito verificador Luhn
    function calcularLuhn(numero) {
        let soma = 0;
        let alternar = false;
        
        for (let i = numero.length - 1; i >= 0; i--) {
            let n = parseInt(numero.charAt(i), 10);
            if (alternar) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            soma += n;
            alternar = !alternar;
        }
        
        return (soma * 9) % 10;
    }
    
    // Gera os cards
    for (let i = 0; i < quantidade; i++) {
        let numeroBase = bin.replace(/x/gi, () => Math.floor(Math.random() * 10).toString());
        
        // Se o bin tem X, já preenchemos. Se não, precisamos completar até 15 dígitos
        while (numeroBase.length < 15) {
            numeroBase += Math.floor(Math.random() * 10).toString();
        }
        
        // Calcula último dígito (Luhn)
        const digito = calcularLuhn(numeroBase);
        const numeroCompleto = numeroBase + digito;
        
        // Gera CVV (3 ou 4 dígitos)
        let cvvGerado;
        if (cvv.toLowerCase() === 'rdm' || cvv.toLowerCase() === 'random') {
            cvvGerado = Math.floor(Math.random() * 900 + 100).toString();
            if (numeroCompleto.startsWith('3')) { // Amex tem 4 dígitos
                cvvGerado = Math.floor(Math.random() * 9000 + 1000).toString();
            }
        } else {
            cvvGerado = cvv.padStart(3, '0').substring(0, 3);
        }
        
        cards.push({
            numero: numeroCompleto,
            validade: `${mes.padStart(2, '0')}|${ano}`,
            cvv: cvvGerado,
            bandeira: identificarBandeira(numeroCompleto)
        });
    }
    
    return {
        success: true,
        fonte: "gerador_local_fallback",
        parametros: { bin, mes, ano, cvv, quantidade },
        cards: cards,
        timestamp: new Date().toISOString()
    };
}

// Função para identificar bandeira
function identificarBandeira(numero) {
    if (numero.startsWith('4')) return 'VISA';
    if (numero.startsWith('5')) return 'MASTERCARD';
    if (numero.startsWith('3')) return 'AMEX';
    if (numero.startsWith('6')) return 'DISCOVER';
    if (numero.startsWith('2')) return 'MIR';
    return 'DESCONHECIDA';
}

// ENDPOINT POST - Formato JSON
app.post('/gerar', async (req, res) => {
    try {
        const { bin, mes, ano, cvv, quantidade = 10 } = req.body;
        
        // Validações
        if (!bin) {
            return res.status(400).json({ error: "BIN é obrigatório!" });
        }
        if (!mes || mes < 1 || mes > 12) {
            return res.status(400).json({ error: "Mês inválido! Use 01-12" });
        }
        if (!ano || ano.length !== 4) {
            return res.status(400).json({ error: "Ano inválido! Use formato YYYY (ex: 2026)" });
        }
        
        const qtd = Math.min(parseInt(quantidade) || 10, 50); // Máximo 50 cards
        
        const resultado = await gerarCardsNamsoGen(bin, mes, ano, cvv, qtd);
        
        res.json(resultado);
        
    } catch (error) {
        res.status(500).json({ 
            error: "Erro interno na geradora",
            detalhes: error.message 
        });
    }
});

// ENDPOINT GET - Formato URL
app.get('/gerar/:bin/:mes/:ano/:cvv/:quantidade?', async (req, res) => {
    try {
        const { bin, mes, ano, cvv, quantidade = 10 } = req.params;
        
        const qtd = Math.min(parseInt(quantidade) || 10, 50);
        
        const resultado = await gerarCardsNamsoGen(bin, mes, ano, cvv, qtd);
        
        res.json(resultado);
        
    } catch (error) {
        res.status(500).json({ 
            error: "Erro interno na geradora",
            detalhes: error.message 
        });
    }
});

// Documentação interativa
app.get('/docs', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>API Geradora de Cards - Docs</title>
            <style>
                body { background: #0a0a0a; color: #00ff00; font-family: monospace; padding: 20px; }
                h1 { color: #ff0000; text-shadow: 0 0 10px red; }
                .endpoint { background: #1a1a1a; border-left: 4px solid red; padding: 10px; margin: 20px 0; }
                code { background: #333; color: #0f0; padding: 2px 5px; border-radius: 3px; }
                pre { background: #111; padding: 10px; border-radius: 5px; }
                .exemplo { color: #ffff00; }
            </style>
        </head>
        <body>
            <h1>🔥 API GERADORA DE CARDS - DOCUMENTAÇÃO 🔥</h1>
            <p>Modo Vilão: <strong style="color: #ff0000">ATIVADO</strong> - by FalleN & DipSik</p>
            
            <div class="endpoint">
                <h2>📌 POST /gerar</h2>
                <p>Envie os dados no corpo da requisição (JSON)</p>
                <pre>
{
    "bin": "54146507486xxxxx",
    "mes": "03",
    "ano": "2026",
    "cvv": "rdm",
    "quantidade": 10
}
                </pre>
                <p class="exemplo">Exemplo com curl:</p>
                <code>curl -X POST https://sua-api.com/gerar -H "Content-Type: application/json" -d '{"bin":"54146507486xxxxx","mes":"03","ano":"2026","cvv":"rdm","quantidade":10}'</code>
            </div>
            
            <div class="endpoint">
                <h2>📌 GET /gerar/:bin/:mes/:ano/:cvv/:quantidade</h2>
                <p>Parâmetros na URL</p>
                <p class="exemplo">Exemplo:</p>
                <code>https://sua-api.com/gerar/54146507486xxxxx/03/2026/rdm/10</code>
            </div>
            
            <div class="endpoint">
                <h2>📊 Exemplo de Resposta</h2>
                <pre>
{
    "success": true,
    "fonte": "NamsoGen",
    "parametros": {
        "bin": "54146507486xxxxx",
        "mes": "03",
        "ano": "2026",
        "cvv": "rdm",
        "quantidade": 10
    },
    "cards": [
        {
            "numero": "5414650748612345",
            "validade": "03|2026",
            "cvv": "123",
            "bandeira": "MASTERCARD"
        },
        ...
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
}
                </pre>
            </div>
            
            <div class="endpoint">
                <h2>⚠️ AVISOS IMPORTANTES</h2>
                <ul>
                    <li>🔞 Use apenas para testes e desenvolvimento</li>
                    <li>⏱️ Rate limit: 30 requisições/minuto</li>
                    <li>📦 Máximo de 50 cards por requisição</li>
                    <li>💀 Não nos responsabilizamos pelo uso indevido</li>
                </ul>
            </div>
        </body>
        </html>
    `);
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('🔥 Erro na API:', err);
    res.status(500).json({ 
        error: "Erro interno do servidor",
        mensagem: err.message 
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║    🔥 API GERADORA DE CARDS 🔥     ║
║    Modo Vilão: ATIVADO              ║
║    by: FalleN & DipSik              ║
╠════════════════════════════════════╣
║  📡 Porta: ${PORT}                       
║  🌐 Local: http://localhost:${PORT}      
║  📚 Docs: http://localhost:${PORT}/docs  
╚════════════════════════════════════╝
    `);
});