document.addEventListener('DOMContentLoaded', async function() {
    const supabaseUrl = 'https://iauqpennhuzdzyayokgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdXFwZW5uaHV6ZHp5YXlva2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzk4ODMsImV4cCI6MjEwNzc1NTg4M30.A_umW2BosxrIRTRgu_maZYq2w5aEhsxz2nGskf1hFjg';
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async function(e) {
            e.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const inputData = document.getElementById('dataSelecionadaAdmin');
    if (inputData) {
        const hoje = new Date().toISOString().split('T')[0];
        inputData.value = hoje;
        carregarHorariosPorData();
        inputData.addEventListener('change', function() {
            verificarDiaUtilAdmin(this);
        });
    }

    carregarServicosAdmin();

    const form = document.getElementById('formAddServico');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const nome = document.getElementById('admNome').value;
            const preco = parseFloat(document.getElementById('admPreco').value);
            const precoManutencaoInput = document.getElementById('admPrecoManutencao').value;
            const preco_manutencao = precoManutencaoInput ? parseFloat(precoManutencaoInput) : null;
            const categoria = document.getElementById('admCategoria').value;

            const fileInput = document.getElementById('admFoto');
            let fotoUrl = 'img/logo.jpeg';
            if (fileInput.files.length > 0) {
                fotoUrl = 'img/' + fileInput.files[0].name;
            }

            const { error } = await window.supabaseClient
                .from('servicos')
                .insert([{ nome, preco, preco_manutencao, categoria, foto: fotoUrl }]);

            if (error) {
                alert("Erro ao cadastrar produto.");
                console.error(error);
            } else {
                alert("Produto cadastrado com sucesso!");
                form.reset();
                carregarServicosAdmin();
            }
        });
    }
});

function verificarDiaUtilAdmin(input) {
    if (!input.value) return;
    const dataEscolhida = new Date(input.value + 'T00:00:00');
    const diaDaSemana = dataEscolhida.getDay();

    if (diaDaSemana === 0 || diaDaSemana === 6) {
        alert("O Beauty Bella Studio funciona apenas de segunda a sexta-feira.");
        input.value = "";
        const container = document.getElementById('gradeHorariosAdmin');
        if (container) container.innerHTML = "";
        return;
    }

    carregarHorariosPorData();
}

async function carregarHorariosPorData() {
    const inputData = document.getElementById('dataSelecionadaAdmin');
    const container = document.getElementById('gradeHorariosAdmin');
    if (!container || !inputData) return;

    const dataEscolhida = inputData.value;
    if (!dataEscolhida) return;

    const horariosPadrao = [
        "08:00", "09:00", "10:00", "11:00", 
        "12:00", "13:00", "14:00", "15:00", 
        "16:00", "17:00", "18:00", "19:00"
    ];

    let { data: horariosDB, error } = await window.supabaseClient
        .from('horarios_por_data')
        .select('*')
        .eq('data', dataEscolhida);

    if (error) {
        console.error("Erro ao buscar horários:", error);
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

    container.innerHTML = '';
    listaHorarios.forEach(hora => {
        let existente = horariosDB ? horariosDB.find(h => h.horario === hora) : null;
        let ativo = existente ? existente.ativo : true;

        const slot = document.createElement('div');
        slot.className = `horario-slot-admin ${ativo ? 'disponivel' : 'indisponivel'}`;
        slot.style.position = 'relative';
        slot.innerHTML = `
            <button type="button" onclick="deletarHorarioData('${dataEscolhida}', '${hora}')" style="position: absolute; top: 5px; right: 8px; background: transparent; border: none; color: #ff6b6b; cursor: pointer; font-size: 1.1rem; font-weight: bold;" title="Excluir horário">×</button>
            <strong>${hora}</strong><br>
            <span style="font-size: 0.8rem;">${ativo ? 'Disponível' : 'Indisponível'}</span>
            <label class="switch" style="display: block; margin: 8px auto 0 auto;">
                <input type="checkbox" ${ativo ? 'checked' : ''} onchange="toggleHorarioData('${dataEscolhida}', '${hora}', this.checked)">
                <span class="slider"></span>
            </label>
        `;
        container.appendChild(slot);
    });
}

window.toggleHorarioData = async function(data, horario, ativo) {
    const aplicarTodos = document.getElementById('aplicarTodosDias')?.checked;

    if (aplicarTodos) {
        let dataAtual = new Date();
        for (let i = 0; i < 60; i++) {
            let diaSemana = dataAtual.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                let dataStr = dataAtual.toISOString().split('T')[0];
                await window.supabaseClient
                    .from('horarios_por_data')
                    .upsert({ data: dataStr, horario: horario, ativo: ativo }, { onConflict: 'data,horario' });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        alert("Alteração aplicada para todos os dias úteis!");
        carregarHorariosPorData();
    } else {
        const { error } = await window.supabaseClient
            .from('horarios_por_data')
            .upsert({ data: data, horario: horario, ativo: ativo }, { onConflict: 'data,horario' });

        if (error) {
            alert("Erro ao atualizar horário no banco.");
            console.error(error);
        } else {
            carregarHorariosPorData();
        }
    }
}

window.adicionarHorarioExtra = async function() {
    const inputData = document.getElementById('dataSelecionadaAdmin');
    const inputHora = document.getElementById('novoHorarioExtra');
    const aplicarTodos = document.getElementById('aplicarTodosDias')?.checked;
    if (!inputData || !inputHora) return;

    const data = inputData.value;
    const horario = inputHora.value;

    if (!data || !horario) {
        alert("Selecione uma data e informe o horário que deseja adicionar.");
        return;
    }

    if (aplicarTodos) {
        let dataAtual = new Date();
        for (let i = 0; i < 60; i++) {
            let diaSemana = dataAtual.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                let dataStr = dataAtual.toISOString().split('T')[0];
                await window.supabaseClient
                    .from('horarios_por_data')
                    .upsert({ data: dataStr, horario: horario, ativo: true }, { onConflict: 'data,horario' });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        alert("Horário extra adicionado para todos os dias úteis!");
        inputHora.value = '';
        carregarHorariosPorData();
    } else {
        const { error } = await window.supabaseClient
            .from('horarios_por_data')
            .upsert({ data: data, horario: horario, ativo: true }, { onConflict: 'data,horario' });

        if (error) {
            alert("Erro ao adicionar horário.");
            console.error(error);
        } else {
            inputHora.value = '';
            carregarHorariosPorData();
        }
    }
}

window.deletarHorarioData = async function(data, horario) {
    const aplicarTodos = document.getElementById('aplicarTodosDias')?.checked;

    if (aplicarTodos) {
        if (!confirm(`Deseja realmente remover o horário ${horario} de TODOS OS DIAS ÚTEIS?`)) return;

        // Deleta o registro do horário em todos os dias úteis futuros cadastrados no banco
        let dataAtual = new Date();
        for (let i = 0; i < 60; i++) {
            let diaSemana = dataAtual.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                let dataStr = dataAtual.toISOString().split('T')[0];
                await window.supabaseClient
                    .from('horarios_por_data')
                    .delete()
                    .eq('data', dataStr)
                    .eq('horario', horario);
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        alert("Horário removido de todos os dias úteis!");
        carregarHorariosPorData();
    } else {
        if (!confirm(`Deseja realmente remover o horário ${horario} deste dia?`)) return;

        const { error } = await window.supabaseClient
            .from('horarios_por_data')
            .delete()
            .eq('data', data)
            .eq('horario', horario);

        if (error) {
            alert("Erro ao excluir horário.");
            console.error(error);
        } else {
            carregarHorariosPorData();
        }
    }
}

async function carregarServicosAdmin() {
    const container = document.getElementById('listaServicosAdmin');
    if (!container) return;

    const { data, error } = await window.supabaseClient.from('servicos').select('*').order('id', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    container.innerHTML = '';
    data.forEach(servico => {
        const item = document.createElement('div');
        item.className = 'service-list-item';
        const fotoExibida = servico.foto || 'img/logo.jpeg';
        const infoManutencao = servico.preco_manutencao ? ` | Manutenção: R$ ${Number(servico.preco_manutencao).toFixed(2)}` : '';

        item.innerHTML = `
            <div class="service-list-info">
                <img src="${fotoExibida}" alt="${servico.nome}" class="service-list-img">
                <div>
                    <h4>${servico.nome}</h4>
                    <p>R$ ${Number(servico.preco).toFixed(2)}${infoManutencao}</p>
                    <small style="color: #aaa;">${servico.categoria}</small>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-edit" onclick="editarServico(${servico.id})">Editar</button>
                <button class="btn-delete" onclick="deletarServico(${servico.id})">Excluir</button>
            </div>
        `;
        container.appendChild(item);
    });
}

window.deletarServico = async function(id) {
    if (confirm("Tem certeza que deseja excluir este item?")) {
        const { error } = await window.supabaseClient.from('servicos').delete().eq('id', id);
        if (error) {
            alert("Erro ao excluir.");
        } else {
            carregarServicosAdmin();
        }
    }
}

window.editarServico = async function(id) {
    const { data, error } = await window.supabaseClient
        .from('servicos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        alert("Erro ao buscar dados do produto para edição.");
        console.error(error);
        return;
    }

    document.getElementById('admNome').value = data.nome;
    document.getElementById('admPreco').value = data.preco;
    document.getElementById('admPrecoManutencao').value = data.preco_manutencao || '';
    document.getElementById('admCategoria').value = data.categoria;

    const form = document.getElementById('formAddServico');
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    document.getElementById('admNome').value = data.nome;
    document.getElementById('admPreco').value = data.preco;
    document.getElementById('admPrecoManutencao').value = data.preco_manutencao || '';
    document.getElementById('admCategoria').value = data.categoria;

    const btnSalvar = document.querySelector('#formAddServico .btn-salvar') || document.querySelector('#formAddServico button[type="submit"]');
    if (btnSalvar) btnSalvar.textContent = "Atualizar produto";

    document.getElementById('formAddServico').addEventListener('submit', async function(e) {
        e.preventDefault();

        const nome = document.getElementById('admNome').value;
        const preco = parseFloat(document.getElementById('admPreco').value);
        const precoManutencaoInput = document.getElementById('admPrecoManutencao').value;
        const preco_manutencao = precoManutencaoInput ? parseFloat(precoManutencaoInput) : null;
        const categoria = document.getElementById('admCategoria').value;

        const fileInput = document.getElementById('admFoto');
        let fotoUrl = data.foto;
        if (fileInput.files.length > 0) {
            fotoUrl = 'img/' + fileInput.files[0].name;
        }

        const { error: updateError } = await window.supabaseClient
            .from('servicos')
            .update({ nome, preco, preco_manutencao, categoria, foto: fotoUrl })
            .eq('id', id);

        if (updateError) {
            alert("Erro ao atualizar produto.");
            console.error(updateError);
        } else {
            alert("Produto atualizado com sucesso!");
            location.reload();
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}