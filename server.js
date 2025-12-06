
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, 'db.json');

// Estrutura básica do "banco"
let db = {
  users: [],     // { id, name, email, password, role, patientId? }
  patients: [],  // { id, userId, nutriId, name, goals, notes }
  checkins: []   // { id, patientId, date, weight, sleep, hunger, training, adherence, notes }
};

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
    } catch (e) {
      console.error('Erro ao ler db.json, iniciando novo banco...', e);
    }
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function genId(prefix) {
  return prefix + '_' + Math.random().toString(36).substr(2, 9);
}

loadDB();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cria um usuário nutricionista padrão se não existir
if (!db.users.some(u => u.role === 'nutri')) {
  const nutri = {
    id: genId('user'),
    name: 'Fernando (Nutri)',
    email: 'nutri@example.com',
    password: '123456', // simples, para você trocar depois
    role: 'nutri'
  };
  db.users.push(nutri);
  saveDB();
  console.log('Usuário nutricionista padrão criado:');
  console.log(`email: ${nutri.email} | senha: ${nutri.password}`);
}

// ---------- ROTAS DA API ----------

// Login simples (nutri ou paciente)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(
    u => u.email === email && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  res.json({ user });
});

// Cadastro de paciente (feito pelo nutri)
app.post('/api/register-patient', (req, res) => {
  const { name, email, password, nutriId } = req.body;

  if (!name || !email || !password || !nutriId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const userId = genId('user');
  const patientId = genId('patient');

  const user = {
    id: userId,
    name,
    email,
    password,
    role: 'paciente',
    patientId
  };

  const patient = {
    id: patientId,
    userId,
    nutriId,
    name,
    goals: '',
    notes: ''
  };

  db.users.push(user);
  db.patients.push(patient);
  saveDB();

  res.json({ user, patient });
});

// Lista pacientes de um nutricionista
app.get('/api/patients/:nutriId', (req, res) => {
  const nutriId = req.params.nutriId;
  const patients = db.patients.filter(p => p.nutriId === nutriId);
  res.json({ patients });
});

// Retorna um paciente específico
app.get('/api/patient/:patientId', (req, res) => {
  const patient = db.patients.find(p => p.id === req.params.patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Paciente não encontrado' });
  }
  res.json({ patient });
});

// Cria um check-in
app.post('/api/checkins', (req, res) => {
  const {
    patientId,
    date,
    weight,
    sleep,
    hunger,
    training,
    adherence,
    notes
  } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'Paciente obrigatório' });
  }

  const id = genId('chk');

  const checkin = {
    id,
    patientId,
    date: date || new Date().toISOString().slice(0, 10),
    weight: weight || null,
    sleep: sleep || null,
    hunger: hunger || null,
    training: training || '',
    adherence: adherence || null,
    notes: notes || ''
  };

  db.checkins.push(checkin);
  saveDB();

  res.json({ checkin });
});

// Lista check-ins de um paciente
app.get('/api/checkins/:patientId', (req, res) => {
  const patientId = req.params.patientId;
  const list = db.checkins.filter(c => c.patientId === patientId);
  // ordena da data mais recente pra mais antiga
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ checkins: list });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
