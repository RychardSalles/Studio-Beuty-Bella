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

    // CADASTRO DE NOVO PRODUTO COM UPLOAD PARA O SUPABASE STORAGE
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

            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                
                // Remove acentos e espaços do nome do arquivo para evitar erro 400 (Invalid key) no Storage
                const nomeLimpo = file.name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-');

                const fileName = `${Date.now()}-${nomeLimpo}`;

                const { error: uploadError } = await window.supabaseClient.storage
                    .from('produtos')
                    .upload(fileName, file);

                if (uploadError) {
                    alert("Erro ao fazer upload da imagem.");
                    console.error(uploadError);
                    return;
                }

                const { data: publicUrlData } = window.supabaseClient.storage
                    .from('produtos')
                    .getPublicUrl(fileName);

                fotoUrl = publicUrlData.publicUrl;
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

    if (diaDaSemana === 0 || diaDaSemana === 1) {
        alert("O Beauty Bella Studio atende apenas de terça a sábado.");
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

    // Busca apenas os horários salvos no banco para esta data específica
    let { data: horariosDB, error } = await window.supabaseClient
        .from('horarios_por_data')
        .select('*')
        .eq('data', dataEscolhida)
        .order('horario', { ascending: true });

    if (error) {
        console.error("Erro ao buscar horários:", error);
        return;
    }

    container.innerHTML = '';

    if (!horariosDB || horariosDB.length === 0) {
        container.innerHTML = '<span style="color: #aaa; font-size: 0.9rem;">Nenhum horário cadastrado para esta data. Use o campo acima para adicionar.</span>';
        return;
    }

    horariosDB.forEach(h => {
        let ativo = h.ativo;

        const slot = document.createElement('div');
        slot.className = `horario-slot-admin ${ativo ? 'disponivel' : 'indisponivel'}`;
        slot.style.position = 'relative';
        slot.innerHTML = `
            <button type="button" onclick="deletarHorarioData('${dataEscolhida}', '${h.horario}')" style="position: absolute; top: 5px; right: 8px; background: transparent; border: none; color: #ff6b6b; cursor: pointer; font-size: 1.1rem; font-weight: bold;" title="Excluir horário">×</button>
            <strong>${h.horario}</strong><br>
            <span style="font-size: 0.8rem;">${ativo ? 'Disponível' : 'Indisponível'}</span>
            <label class="switch" style="display: block; margin: 8px auto 0 auto;">
                <input type="checkbox" ${ativo ? 'checked' : ''} onchange="toggleHorarioData('${dataEscolhida}', '${h.horario}', this.checked)">
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
            if (diaSemana !== 0 && diaSemana !== 1) {
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
            if (diaSemana !== 0 && diaSemana !== 1) {
                let dataStr = dataAtual.toISOString().split('T')[0];
                await window.supabaseClient
                    .from('horarios_por_data')
                    .upsert({ data: dataStr, horario: horario, ativo: true }, { onConflict: 'data,horario' });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        alert("Horário adicionado para todos os dias úteis!");
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
        if (!confirm(`Deseja realmente remover o horário ${horario} de TODOS OS DIAS ÚTEIS (Terça a Sábado)?`)) return;

        let dataAtual = new Date();
        for (let i = 0; i < 60; i++) {
            let diaSemana = dataAtual.getDay();
            if (diaSemana !== 0 && diaSemana !== 1) {
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
    const inputManutencao = document.getElementById('admPrecoManutencao');
    if (inputManutencao) inputManutencao.value = data.preco_manutencao || '';
    document.getElementById('admCategoria').value = data.categoria;

    const form = document.getElementById('formAddServico');
    const novoForm = form.cloneNode(true);
    form.pathname = form.parentNode.replaceChild(novoForm, form);

    document.getElementById('admNome').value = data.nome;
    document.getElementById('admPreco').value = data.preco;
    const inputManutencaoNovo = document.getElementById('admPrecoManutencao');
    if (inputManutencaoNovo) inputManutencaoNovo.value = data.preco_manutencao || '';
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

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            const nomeLimpo = file.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');

            const fileName = `${Date.now()}-${nomeLimpo}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('produtos')
                .upload(fileName, file);

            if (uploadError) {
                alert("Erro ao fazer upload da nova imagem.");
                console.error(uploadError);
                return;
            }

            const { data: publicUrlData } = window.supabaseClient.storage
                .from('produtos')
                .getPublicUrl(fileName);

            fotoUrl = publicUrlData.publicUrl;
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