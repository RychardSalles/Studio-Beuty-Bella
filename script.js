document.addEventListener('DOMContentLoaded', async function() {
    const supabaseUrl = 'https://iauqpennhuzdzyayokgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdXFwZW5uaHV6ZHp5YXlva2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzk4ODMsImV4cCI6MjEwNzc1NTg4M30.A_umW2BosxrIRTRgu_maZYq2w5aEhsxz2nGskf1hFjg';
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    const inputDataCliente = document.getElementById('dataAgendamento');
    if (inputDataCliente) {
        let hojeDate = new Date();
        let diaSemanaHoje = hojeDate.getDay();

        // Se hoje for domingo (0) ou segunda (1), ajusta para a próxima terça-feira automaticamente
        if (diaSemanaHoje === 0) {
            hojeDate.setDate(hojeDate.getDate() + 2);
        } else if (diaSemanaHoje === 1) {
            hojeDate.setDate(hojeDate.getDate() + 1);
        }

        const dataInicialStr = hojeDate.toISOString().split('T')[0];
        inputDataCliente.value = dataInicialStr;
        inputDataCliente.min = dataInicialStr;
        carregarHorariosDoDia(dataInicialStr);

        inputDataCliente.addEventListener('change', function() {
            verificarDiaUtilCliente(this);
        });
    }

    carregarServicosCliente();

    // Controle dos Passos do Formulário (Próximo / Voltar)
    const btnProximo = document.getElementById('btnProximo');
    const btnVoltar = document.getElementById('btnVoltar');
    const step1Content = document.getElementById('step1-content');
    const step2Content = document.getElementById('step2-content');
    const step1Indicator = document.getElementById('step1-indicator');
    const step2Indicator = document.getElementById('step2-indicator');

    if (btnProximo) {
        btnProximo.addEventListener('click', function() {
            const servico = document.getElementById('servicoSelecionado').value;
            const data = document.getElementById('dataAgendamento').value;
            const horario = document.getElementById('horarioAgendamento').value;

            if (!servico || !data || !horario) {
                alert("Por favor, selecione um serviço, uma data e um horário disponível.");
                return;
            }

            if (step1Content) step1Content.style.display = 'none';
            if (step2Content) step2Content.style.display = 'block';

            if (step1Indicator) step1Indicator.classList.remove('active');
            if (step2Indicator) step2Indicator.classList.add('active');
        });
    }

    if (btnVoltar) {
        btnVoltar.addEventListener('click', function() {
            if (step2Content) step2Content.style.display = 'none';
            if (step1Content) step1Content.style.display = 'block';

            if (step2Indicator) step2Indicator.classList.remove('active');
            if (step1Indicator) step1Indicator.classList.add('active');
        });
    }

    // Envio do Agendamento (Redirecionamento para WhatsApp) com Nome primeiro e Data formatada DD-MM-YYYY
    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', function(e) {
            e.preventDefault();
            const servico = document.getElementById('servicoSelecionado').value;
            const dataISO = document.getElementById('dataAgendamento').value;
            const horario = document.getElementById('horarioAgendamento').value;
            const nome = document.getElementById('nomeCliente').value;

            let dataFormatada = dataISO;
            if (dataISO) {
                const partes = dataISO.split('-');
                if (partes.length === 3) {
                    dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                }
            }

            const telefoneStudio = "5519994601542"; // Seu WhatsApp
            const mensagem = `Olá! Gostaria de confirmar meu agendamento:%0A*Nome:* ${nome}%0A*Serviço:* ${servico}%0A*Data:* ${dataFormatada}%0A*Horário:* ${horario}`;
            
            window.open(`https://api.whatsapp.com/send?phone=${telefoneStudio}&text=${mensagem}`, '_blank');
        });
    }
});

// Valida se o dia escolhido é útil (Terça a Sábado - Bloqueia Domingo 0 e Segunda 1)
function verificarDiaUtilCliente(input) {
    if (!input.value) return;
    
    const dataEscolhida = new Date(input.value + 'T00:00:00');
    const diaDaSemana = dataEscolhida.getDay(); // 0 = Domingo, 1 = Segunda

    if (diaDaSemana === 0 || diaDaSemana === 1) {
        alert("O Beauty Bella Studio atende apenas de terça a sábado. Por favor, selecione um dia útil.");
        input.value = ""; 
        const container = document.getElementById('containerHorariosCliente');
        if (container) container.innerHTML = "";
        return;
    }

    carregarHorariosDoDia(input.value);
}

// Carrega horários dinâmicos bloqueando horários passados do dia atual
async function carregarHorariosDoDia(dataSelecionada) {
    const container = document.getElementById('containerHorariosCliente');
    const inputHorario = document.getElementById('horarioAgendamento');
    if (!container) return;

    container.innerHTML = '<span style="color: #aaa; font-size: 0.9rem;">Carregando horários...</span>';
    if (inputHorario) inputHorario.value = '';

    const horariosPadrao = [
        "08:00", "09:00", "10:00", "11:00", 
        "12:00", "13:00", "14:00", "15:00", 
        "16:00", "17:00", "18:00", "19:00"
    ];

    let { data: horariosDB, error } = await window.supabaseClient
        .from('horarios_por_data')
        .select('*')
        .eq('data', dataSelecionada);

    if (error) {
        console.error("Erro ao buscar horários:", error);
        container.innerHTML = '<span style="color: #ff6b6b; font-size: 0.9rem;">Erro ao carregar horários.</span>';
        return;
    }

    let listaHorarios = [...horariosPadrao];
    if (horariosDB) {
        horariosDB.forEach(h => {
            if (!listaHorarios.includes(h.horario)) {
                listaHorarios.push(h.horario);
            }
        });
        listaHorarios.sort();
    }

    // Identifica data e hora atual para bloquear horários já passados no dia de hoje
    const agora = new Date();
    const dataHojeStr = agora.toISOString().split('T')[0];
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    container.innerHTML = '';
    let horariosDisponiveisEncontrados = false;

    listaHorarios.forEach(hora => {
        let existente = horariosDB ? horariosDB.find(h => h.horario === hora) : null;
        let ativo = existente ? existente.ativo : true;

        // Se for o dia de hoje, verifica se o horário já passou
        if (dataSelecionada === dataHojeStr && ativo) {
            const [horaSlot, minutoSlot] = hora.split(':').map(Number);
            if (horaSlot < horaAtual || (horaSlot === horaAtual && minutoAtual > 0)) {
                ativo = false; // Oculta horários que já passaram hoje
            }
        }

        if (ativo) {
            horariosDisponiveisEncontrados = true;
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.innerText = hora;

            slot.addEventListener('click', function() {
                document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                if (inputHorario) inputHorario.value = hora;
            });

            container.appendChild(slot);
        }
    });

    if (!horariosDisponiveisEncontrados) {
        container.innerHTML = '<span style="color: #ff6b6b; font-size: 0.9rem;">Nenhum horário disponível para esta data.</span>';
    }
}

// Carrega os serviços do Supabase para as categorias e para o select
async function carregarServicosCliente() {
    const containerCilios = document.getElementById('lista-cilios');
    const containerSobrancelhas = document.getElementById('lista-sobrancelhas');
    const containerMaquiagem = document.getElementById('lista-maquiagem');
    const selectServico = document.getElementById('servicoSelecionado');

    const { data, error } = await window.supabaseClient
        .from('servicos')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Erro ao carregar serviços:", error);
        return;
    }

    if (containerCilios) containerCilios.innerHTML = '';
    if (containerSobrancelhas) containerSobrancelhas.innerHTML = '';
    if (containerMaquiagem) containerMaquiagem.innerHTML = '';
    if (selectServico) selectServico.innerHTML = '<option value="" disabled selected>- Selecione um serviço -</option>';

    data.forEach(servico => {
        const infoManutencao = servico.preco_manutencao ? `<p style="font-size: 0.8rem; color: #aaa;">Manutenção: R$ ${Number(servico.preco_manutencao).toFixed(2)}</p>` : '';
        
        const itemHtml = `
            <div class="service-item">
                <img src="${servico.foto || 'img/logo.jpeg'}" alt="${servico.nome}" class="service-img">
                <div class="service-info">
                    <h3>${servico.nome}</h3>
                    <p>R$ ${Number(servico.preco).toFixed(2)}</p>
                    ${infoManutencao}
                </div>
            </div>
        `;

        if (servico.categoria === 'Extensão de Cílios & Manutenções' && containerCilios) {
            containerCilios.innerHTML += itemHtml;
        } else if (servico.categoria === 'Sobrancelhas' && containerSobrancelhas) {
            containerSobrancelhas.innerHTML += itemHtml;
        } else if (servico.categoria === 'Maquiagem' && containerMaquiagem) {
            containerMaquiagem.innerHTML += itemHtml;
        }

        if (selectServico) {
            const option = document.createElement('option');
            option.value = servico.nome;
            option.textContent = `${servico.nome} - R$ ${Number(servico.preco).toFixed(2)}`;
            selectServico.appendChild(option);
        }
    });
}