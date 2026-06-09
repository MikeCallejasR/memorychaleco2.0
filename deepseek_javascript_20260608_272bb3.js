// Configuración de Supabase (REEMPLAZA CON TUS DATOS)
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; // ← CAMBIA ESTO
const SUPABASE_KEY = 'tu-clave-anon-publica';          // ← CAMBIA ESTO

let supabase;
let participanteActivo = null;
let partidosGlobal = [];
let todosParticipantes = [];

// Inicializa Supabase y carga datos iniciales
async function initSupabase() {
    if (!SUPABASE_URL.includes('tu-proyecto') && !SUPABASE_KEY.includes('tu-clave')) {
        supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('⚠️ Configura las credenciales de Supabase en script.js');
        // Modo demo con localStorage
        supabase = null;
    }
    await cargarDatosIniciales();
}

async function cargarDatosIniciales() {
    // Cargar partidos desde data/calendario.js
    if (typeof calendarioMundial !== 'undefined') {
        partidosGlobal = calendarioMundial;
    } else {
        partidosGlobal = generarCalendarioDemo();
    }
    
    if (supabase) {
        await cargarParticipantesDesdeSupabase();
        await sincronizarPartidosConSupabase();
        await cargarPronosticosYResultados();
    } else {
        cargarParticipantesDesdeLocal();
    }
    renderizarCalendario();
    renderizarTablaPosiciones();
}

// ==================== FUNCIONES PRINCIPALES ====================

function generarCalendarioDemo() {
    // Datos de muestra si no existe el archivo calendario.js
    return [
        { id: 1, fecha: '11/06/2026', hora: '13:00', equipo_local: 'México', equipo_visitante: 'Sudáfrica', fase: 'Grupos', resultado_local: null, resultado_visitante: null, finalizado: false, goleadores: [] },
        { id: 2, fecha: '12/06/2026', hora: '20:00', equipo_local: 'Argentina', equipo_visitante: 'Nigeria', fase: 'Grupos', resultado_local: null, resultado_visitante: null, finalizado: false, goleadores: [] }
    ];
}

async function cargarParticipantesDesdeSupabase() {
    const { data, error } = await supabase.from('participantes').select('*').order('nombre');
    if (!error && data) todosParticipantes = data;
    renderizarListaParticipantes();
}

function cargarParticipantesDesdeLocal() {
    const stored = localStorage.getItem('quiniela_participantes');
    if (stored) todosParticipantes = JSON.parse(stored);
    renderizarListaParticipantes();
}

function renderizarListaParticipantes() {
    const container = document.getElementById('listaParticipantes');
    if (!container) return;
    
    if (todosParticipantes.length === 0) {
        container.innerHTML = '<p>✨ Aún no hay participantes. ¡Agrega los primeros!</p>';
        document.getElementById('seleccionarParticipanteCard').style.display = 'none';
        return;
    }
    
    const select = document.getElementById('selectParticipante');
    select.innerHTML = '<option value="">-- Seleccionar --</option>' + 
        todosParticipantes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    
    const listaHtml = '<div class="participantes-badges">' + 
        todosParticipantes.map(p => `<span class="badge">${p.nombre}</span>`).join('') + 
        '</div>';
    container.innerHTML = listaHtml;
    document.getElementById('seleccionarParticipanteCard').style.display = 'block';
}

document.getElementById('agregarParticipanteBtn')?.addEventListener('click', async () => {
    const nombre = document.getElementById('participanteNombre').value.trim();
    if (!nombre) return alert('Ingresa un nombre válido');
    
    if (supabase) {
        const { data, error } = await supabase.from('participantes').insert({ nombre }).select();
        if (error) return alert('Error: ' + error.message);
        todosParticipantes.push(data[0]);
    } else {
        const nuevoId = Date.now();
        const nuevo = { id: nuevoId, nombre };
        todosParticipantes.push(nuevo);
        localStorage.setItem('quiniela_participantes', JSON.stringify(todosParticipantes));
    }
    document.getElementById('participanteNombre').value = '';
    renderizarListaParticipantes();
});

document.getElementById('confirmarParticipanteBtn')?.addEventListener('click', () => {
    const select = document.getElementById('selectParticipante');
    const idSeleccionado = parseInt(select.value);
    if (!idSeleccionado) return alert('Selecciona un participante');
    participanteActivo = todosParticipantes.find(p => p.id === idSeleccionado);
    if (participanteActivo) {
        document.getElementById('bienvenidaParticipante').style.display = 'block';
        document.getElementById('nombreActivo').innerText = participanteActivo.nombre;
        document.getElementById('registroCard').style.display = 'none';
        document.getElementById('seleccionarParticipanteCard').style.display = 'none';
        cargarPronosticosParticipante();
    }
});

document.getElementById('cambiarParticipanteBtn')?.addEventListener('click', () => {
    participanteActivo = null;
    document.getElementById('bienvenidaParticipante').style.display = 'none';
    document.getElementById('registroCard').style.display = 'block';
    document.getElementById('seleccionarParticipanteCard').style.display = 'block';
    document.getElementById('pronosticoForm').style.display = 'none';
});

function renderizarCalendario() {
    const container = document.getElementById('calendarioPartidos');
    if (!container) return;
    
    const faseActiva = document.querySelector('.filtro-btn.active')?.dataset.fase || 'all';
    let partidosFiltrados = partidosGlobal;
    if (faseActiva !== 'all') {
        partidosFiltrados = partidosGlobal.filter(p => p.fase === faseActiva);
    }
    
    container.innerHTML = partidosFiltrados.map(partido => `
        <div class="partido-card" data-id="${partido.id}">
            <div class="fecha">${partido.fecha} • ${partido.hora}</div>
            <div class="equipos">${partido.equipo_local} vs ${partido.equipo_visitante}</div>
            <div class="resultado">
                ${partido.finalizado ? 
                    `<strong>${partido.resultado_local} - ${partido.resultado_visitante}</strong>` : 
                    '⏳ Por disputarse'}
            </div>
            <div class="pronostico" id="pronostico-${partido.id}">
                ${participanteActivo ? 'Cargando tu pronóstico...' : 'Selecciona un participante para pronosticar'}
            </div>
            ${participanteActivo && !partido.finalizado ? 
                `<button class="btn-outline pronosticar-btn" data-id="${partido.id}" style="margin-top:10px; width:100%;">📝 Pronosticar</button>` : 
                ''}
        </div>
    `).join('');
    
    // Eventos de botones pronosticar
    document.querySelectorAll('.pronosticar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partidoId = parseInt(btn.dataset.id);
            mostrarFormularioPronostico(partidoId);
        });
    });
}

function mostrarFormularioPronostico(partidoId) {
    const partido = partidosGlobal.find(p => p.id === partidoId);
    if (!partido) return;
    
    document.getElementById('partidoPronostico').innerText = 
        `${partido.equipo_local} vs ${partido.equipo_visitante} (${partido.fecha})`;
    
    // Cargar pronóstico existente si lo hay
    cargarPronosticoExistente(partidoId);
    
    document.getElementById('pronosticoForm').style.display = 'block';
    document.getElementById('pronosticoForm').scrollIntoView({ behavior: 'smooth' });
    
    // Guardar evento
    const guardarBtn = document.getElementById('guardarPronosticoBtn');
    const cerrarBtn = document.getElementById('cerrarPronosticoBtn');
    
    guardarBtn.onclick = () => guardarPronostico(partidoId);
    cerrarBtn.onclick = () => document.getElementById('pronosticoForm').style.display = 'none';
}

async function guardarPronostico(partidoId) {
    const golesLocal = parseInt(document.getElementById('golesLocal').value) || 0;
    const golesVisitante = parseInt(document.getElementById('golesVisitante').value) || 0;
    const penales = document.getElementById('penalesCheckbox').checked;
    const jugadorGol = document.getElementById('jugadorGol').value.trim();
    
    if (!participanteActivo) return alert('Primero selecciona un participante');
    
    if (supabase) {
        const { error } = await supabase.from('pronosticos').upsert({
            participante_id: participanteActivo.id,
            partido_id: partidoId,
            pronostico_local: golesLocal,
            pronostico_visitante: golesVisitante,
            ganador_penales: penales,
            jugador_gol: jugadorGol || null
        });
        if (error) return alert('Error al guardar: ' + error.message);
    } else {
        const pronosticosKey = `quiniela_pronosticos_${participanteActivo.id}`;
        const pronosticos = JSON.parse(localStorage.getItem(pronosticosKey) || '{}');
        pronosticos[partidoId] = { golesLocal, golesVisitante, penales, jugadorGol };
        localStorage.setItem(pronosticosKey, JSON.stringify(pronosticos));
    }
    
    alert('✅ Pronóstico guardado correctamente');
    document.getElementById('pronosticoForm').style.display = 'none';
    renderizarCalendario();
    await actualizarPuntajesParticipante();
}

async function actualizarPuntajesParticipante() {
    if (!participanteActivo) return;
    
    // Algoritmo de puntuación
    let puntajeTotal = 0;
    
    for (const partido of partidosGlobal) {
        if (!partido.finalizado) continue;
        
        const pronostico = await obtenerPronostico(participanteActivo.id, partido.id);
        if (!pronostico) continue;
        
        // 3 pts por resultado exacto
        if (pronostico.golesLocal === partido.resultado_local && 
            pronostico.golesVisitante === partido.resultado_visitante) {
            puntajeTotal += 3;
        }
        // 2 pts por país ganador
        const ganadorReal = obtenerGanador(partido.resultado_local, partido.resultado_visitante, partido.penales_real);
        const ganadorPronosticado = obtenerGanador(pronostico.golesLocal, pronostico.golesVisitante, pronostico.penales);
        if (ganadorReal && ganadorReal === ganadorPronosticado) {
            puntajeTotal += 2;
        }
        // 1 pt por jugador gol
        if (pronostico.jugadorGol && partido.goleadores && partido.goleadores.includes(pronostico.jugadorGol)) {
            puntajeTotal += 1;
        }
    }
    
    if (supabase) {
        await supabase.from('puntajes').upsert({
            participante_id: participanteActivo.id,
            puntaje_total: puntajeTotal
        });
    } else {
        localStorage.setItem(`quiniela_puntaje_${participanteActivo.id}`, puntajeTotal);
    }
    
    renderizarTablaPosiciones();
}

function obtenerGanador(golesLocal, golesVisitante, penales = false) {
    if (golesLocal > golesVisitante) return 'local';
    if (golesLocal < golesVisitante) return 'visitante';
    if (penales) return null; // se define en penales, se maneja aparte
    return 'empate';
}

async function renderizarTablaPosiciones() {
    const container = document.getElementById('tablaPosiciones');
    if (!container) return;
    
    let puntajesLista = [];
    
    if (supabase) {
        const { data } = await supabase.from('puntajes').select('*');
        if (data) puntajesLista = data;
    } else {
        puntajesLista = todosParticipantes.map(p => ({
            participante_id: p.id,
            puntaje_total: parseInt(localStorage.getItem(`quiniela_puntaje_${p.id}`) || '0')
        }));
    }
    
    const ranking = puntajesLista.map(p => {
        const participante = todosParticipantes.find(part => part.id === p.participante_id);
        return { nombre: participante?.nombre || '?', puntaje: p.puntaje_total };
    }).sort((a,b) => b.puntaje - a.puntaje);
    
    if (ranking.length === 0) {
        container.innerHTML = '<div class="loading">Sin puntajes aún. Realiza pronósticos.</div>';
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr><th>Posición</th><th>Participante</th><th>Puntaje</th></tr>
            </thead>
            <tbody>
                ${ranking.map((r, idx) => `
                    <tr>
                        <td>${idx+1}</td>
                        <td>${r.nombre}</td>
                        <td><strong>${r.puntaje}</strong> pts</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    
    // Filtros de fase
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarCalendario();
        });
    });
    
    // Admin panel
    document.getElementById('adminBtn')?.addEventListener('click', () => {
        const panel = document.getElementById('adminPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') cargarPanelAdmin();
    });
    
    // Exportar/importar respaldo
    document.getElementById('exportarDatosBtn')?.addEventListener('click', exportarDatos);
    document.getElementById('importarDatosBtn')?.addEventListener('click', () => {
        document.getElementById('importarArchivo').click();
    });
    document.getElementById('importarArchivo')?.addEventListener('change', importarDatos);
});

function exportarDatos() {
    const datos = {
        participantes: todosParticipantes,
        partidos: partidosGlobal,
        fecha: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiniela_respaldo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const datos = JSON.parse(e.target.result);
            if (datos.participantes) {
                todosParticipantes = datos.participantes;
                localStorage.setItem('quiniela_participantes', JSON.stringify(todosParticipantes));
            }
            if (datos.partidos) {
                partidosGlobal = datos.partidos;
            }
            alert('✅ Datos importados correctamente');
            location.reload();
        } catch (err) {
            alert('Error: archivo inválido');
        }
    };
    reader.readAsText(file);
}

// Funciones auxiliares para obtener pronósticos
async function obtenerPronostico(participanteId, partidoId) {
    if (supabase) {
        const { data } = await supabase.from('pronosticos')
            .select('*')
            .eq('participante_id', participanteId)
            .eq('partido_id', partidoId)
            .single();
        return data;
    } else {
        const key = `quiniela_pronosticos_${participanteId}`;
        const pronosticos = JSON.parse(localStorage.getItem(key) || '{}');
        const p = pronosticos[partidoId];
        if (p) return {
            golesLocal: p.golesLocal,
            golesVisitante: p.golesVisitante,
            penales: p.penales,
            jugadorGol: p.jugadorGol
        };
        return null;
    }
}

function cargarPronosticoExistente(partidoId) {
    // Carga valores actuales en el formulario
}