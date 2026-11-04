import os
import sys
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Configuração do Banco de Dados (PostgreSQL no Render ou SQLite Local)
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        import psycopg2.extras
        # Ajusta a URL para o formato exigido pelo SQLAlchemy/psycopg2 se necessário
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1) if DATABASE_URL.startswith("postgres://") else DATABASE_URL
        conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
        return conn
    else:
        import sqlite3
        if getattr(sys, 'frozen', False):
            caminho_base = os.path.dirname(sys.executable)
        else:
            caminho_base = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(caminho_base, 'banco_deziderio.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys = ON')
        return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    if DATABASE_URL:
        # PostgreSQL (Render)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS servicos (
                id SERIAL PRIMARY KEY,
                area TEXT NOT NULL,
                description TEXT NOT NULL,
                unit TEXT DEFAULT 'm²',
                price DOUBLE PRECISION DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orcamentos (
                id SERIAL PRIMARY KEY,
                orc_number TEXT UNIQUE,
                obra_name TEXT,
                client_name TEXT,
                client_contact TEXT,
                client_doc TEXT,
                client_phone TEXT,
                client_address TEXT,
                orc_date TEXT,
                orc_medicao TEXT,
                payment_method TEXT,
                pix_key TEXT,
                discount DOUBLE PRECISION,
                down_payment DOUBLE PRECISION,
                subtotal DOUBLE PRECISION,
                total_final DOUBLE PRECISION,
                notes TEXT,
                internal_notes TEXT,
                items_json TEXT,
                status TEXT,
                status_updated_at TEXT,
                created_at TEXT,
                deleted_at TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY,
                razao_social TEXT,
                cnpj TEXT,
                endereco TEXT,
                telefone TEXT,
                pix_chave TEXT,
                observacoes_padrao TEXT,
                logo_url TEXT,
                qrcode_pix_url TEXT
            )
        """)
        cursor.execute("SELECT COUNT(*) AS total FROM configuracoes")
        if cursor.fetchone()['total'] == 0:
            cursor.execute("""
                INSERT INTO configuracoes
                (id, razao_social, cnpj, endereco, telefone, pix_chave, observacoes_padrao, logo_url, qrcode_pix_url)
                VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                "DEZIDERIO - ESPECIALISTA EM PINTURA E ACABAMENTO",
                "30.654.467/0001-16",
                "Rua Renato Pereira de Campos, nº 2489",
                "(17) 99283-5555",
                "30.654.467/0001-16 (CNPJ - Deziderio)",
                "O serviço será executado de forma profissional. Respeitando as normas técnicas dos produtos a serem usados nesse projeto. Fazemos todo o isolamento devido para não causar danos ao imóvel. Buscamos sempre melhoria contínua entregando um projeto com qualidade.",
                "", ""
            ))
    else:
        # SQLite (desenvolvimento local)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS servicos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                area TEXT NOT NULL,
                description TEXT NOT NULL,
                unit TEXT DEFAULT 'm²',
                price REAL DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orcamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orc_number TEXT UNIQUE,
                obra_name TEXT,
                client_name TEXT,
                client_contact TEXT,
                client_doc TEXT,
                client_phone TEXT,
                client_address TEXT,
                orc_date TEXT,
                orc_medicao TEXT,
                payment_method TEXT,
                pix_key TEXT,
                discount REAL,
                down_payment REAL,
                subtotal REAL,
                total_final REAL,
                notes TEXT,
                internal_notes TEXT,
                items_json TEXT,
                status TEXT,
                status_updated_at TEXT,
                created_at TEXT,
                deleted_at TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                razao_social TEXT,
                cnpj TEXT,
                endereco TEXT,
                telefone TEXT,
                pix_chave TEXT,
                observacoes_padrao TEXT,
                logo_url TEXT,
                qrcode_pix_url TEXT
            )
        """)
        cursor.execute("SELECT COUNT(*) AS total FROM configuracoes")
        if cursor.fetchone()['total'] == 0:
            cursor.execute("""
                INSERT INTO configuracoes
                (razao_social, cnpj, endereco, telefone, pix_chave, observacoes_padrao, logo_url, qrcode_pix_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "DEZIDERIO - ESPECIALISTA EM PINTURA E ACABAMENTO",
                "30.654.467/0001-16",
                "Rua Renato Pereira de Campos, nº 2489",
                "(17) 99283-5555",
                "30.654.467/0001-16 (CNPJ - Deziderio)",
                "O serviço será executado de forma profissional. Respeitando as normas técnicas dos produtos a serem usados nesse projeto. Fazemos todo o isolamento devido para não causar danos ao imóvel. Buscamos sempre melhoria contínua entregando um projeto com qualidade.",
                "", ""
            ))

    # Migrações seguras para bases já existentes.
    if DATABASE_URL:
        cursor.execute("ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS deleted_at TEXT")
    else:
        colunas = [r['name'] for r in cursor.execute("PRAGMA table_info(orcamentos)").fetchall()]
        if 'deleted_at' not in colunas:
            cursor.execute("ALTER TABLE orcamentos ADD COLUMN deleted_at TEXT")
    if DATABASE_URL:
        cursor.execute("""CREATE TABLE IF NOT EXISTS atividades_auditoria (
            id SERIAL PRIMARY KEY, tipo TEXT NOT NULL, orc_number TEXT, descricao TEXT,
            cliente TEXT, obra TEXT, valor DOUBLE PRECISION, detalhes TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        )""")
    else:
        cursor.execute("""CREATE TABLE IF NOT EXISTS atividades_auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, orc_number TEXT, descricao TEXT,
            cliente TEXT, obra TEXT, valor REAL, detalhes TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        )""")

    # Controle financeiro: tabela independente, sem alterar os orçamentos existentes.
    if DATABASE_URL:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pagamentos (
                id SERIAL PRIMARY KEY,
                orc_number TEXT NOT NULL REFERENCES orcamentos(orc_number),
                valor DOUBLE PRECISION NOT NULL CHECK (valor > 0),
                data_pagamento TEXT NOT NULL,
                metodo TEXT,
                observacao TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pagamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orc_number TEXT NOT NULL,
                valor REAL NOT NULL CHECK (valor > 0),
                data_pagamento TEXT NOT NULL,
                metodo TEXT,
                observacao TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (orc_number) REFERENCES orcamentos(orc_number)
            )
        """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pagamentos_orc ON pagamentos(orc_number)")

    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/configuracoes', methods=['GET', 'POST'])
def gerenciar_configuracoes():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        dados = request.json or {}
        if DATABASE_URL:
            cursor.execute("""
                UPDATE configuracoes SET 
                    razao_social=%s, cnpj=%s, endereco=%s, telefone=%s, pix_chave=%s, observacoes_padrao=%s, logo_url=%s, qrcode_pix_url=%s
                WHERE id = 1
            """, (
                dados.get('razao_social'), dados.get('cnpj'), dados.get('endereco'),
                dados.get('telefone'), dados.get('pix_chave'), dados.get('observacoes_padrao'),
                dados.get('logo_url'), dados.get('qrcode_pix_url')
            ))
        else:
            cursor.execute("""
                UPDATE configuracoes SET 
                    razao_social=?, cnpj=?, endereco=?, telefone=?, pix_chave=?, observacoes_padrao=?, logo_url=?, qrcode_pix_url=?
                WHERE id = 1
            """, (
                dados.get('razao_social'), dados.get('cnpj'), dados.get('endereco'),
                dados.get('telefone'), dados.get('pix_chave'), dados.get('observacoes_padrao'),
                dados.get('logo_url'), dados.get('qrcode_pix_url')
            ))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Configurações atualizadas com sucesso!"})
    
    cursor.execute("SELECT * FROM configuracoes WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        config_dict = {}
    elif DATABASE_URL:
        config_dict = dict(row)
    else:
        config_dict = dict(row)
        
    return jsonify({"status": "success", "config": config_dict})

@app.route('/api/listar', methods=['GET'])
def listar_orcamentos():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM orcamentos WHERE deleted_at IS NULL ORDER BY id DESC")
        rows = cursor.fetchall()
        # Converte para lista de dicionários compatível com JSON
        if DATABASE_URL:
            lista = [dict(r) for r in rows]
        else:
            lista = [dict(r) for r in rows]
        return jsonify(lista)
    except Exception as e:
        print("Erro no listar:", str(e))
        return jsonify([]), 200  # Retorna lista vazia em caso de erro para não quebrar o painel
    finally:
        conn.close()

@app.route('/api/salvar', methods=['POST'])
def salvar_orcamento():
    dados = request.json or {}
    orc_number = dados.get('orc_number')
    if not orc_number:
        return jsonify({"status": "error", "message": "Número de orçamento inválido"}), 400

    novo_status = dados.get('status', 'Enviado')
    status_validos = {'Enviado', 'Em andamento', 'Aprovado', 'Recusado'}
    if novo_status not in status_validos:
        return jsonify({"status": "error", "message": "Status inválido."}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        
        cursor.execute(f"SELECT id, status, status_updated_at FROM orcamentos WHERE orc_number = {p}", (orc_number,))
        existente = cursor.fetchone()
        
        if existente:
            est_status = existente['status']
            est_updated = existente['status_updated_at']
            if est_status == 'Aprovado':
                return jsonify({"status": "error", "message": "Este orçamento já foi aprovado e está bloqueado para edição."}), 409

        if DATABASE_URL:
            cursor.execute("SELECT TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') AS agora")
        else:
            cursor.execute("SELECT datetime('now', 'localtime') AS agora")
        agora = cursor.fetchone()['agora']

        if existente:
            est_status = existente['status']
            status_updated_at = agora if est_status != novo_status else (est_updated or agora)
            
            if DATABASE_URL:
                cursor.execute("""
                    UPDATE orcamentos SET
                        obra_name=%s, client_name=%s, client_contact=%s, client_doc=%s, client_phone=%s, client_address=%s,
                        orc_date=%s, orc_medicao=%s, payment_method=%s, pix_key=%s, discount=%s, down_payment=%s,
                        subtotal=%s, total_final=%s, notes=%s, internal_notes=%s, items_json=%s, status=%s, status_updated_at=%s
                    WHERE orc_number=%s AND COALESCE(status, '') <> 'Aprovado'
                """, (
                    dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'), dados.get('client_doc'),
                    dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'), dados.get('orc_medicao'),
                    dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'), dados.get('down_payment'),
                    dados.get('subtotal'), dados.get('total_final'), dados.get('notes'), dados.get('internal_notes'),
                    dados.get('items_json'), novo_status, status_updated_at, orc_number
                ))
            else:
                cursor.execute("""
                    UPDATE orcamentos SET
                        obra_name=?, client_name=?, client_contact=?, client_doc=?, client_phone=?, client_address=?,
                        orc_date=?, orc_medicao=?, payment_method=?, pix_key=?, discount=?, down_payment=?,
                        subtotal=?, total_final=?, notes=?, internal_notes=?, items_json=?, status=?, status_updated_at=?
                    WHERE orc_number=? AND COALESCE(status, '') <> 'Aprovado'
                """, (
                    dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'), dados.get('client_doc'),
                    dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'), dados.get('orc_medicao'),
                    dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'), dados.get('down_payment'),
                    dados.get('subtotal'), dados.get('total_final'), dados.get('notes'), dados.get('internal_notes'),
                    dados.get('items_json'), novo_status, status_updated_at, orc_number
                ))
        else:
            if DATABASE_URL:
                cursor.execute("""
                    INSERT INTO orcamentos (
                        orc_number, obra_name, client_name, client_contact, client_doc, client_phone, client_address,
                        orc_date, orc_medicao, payment_method, pix_key, discount, down_payment, subtotal, total_final,
                        notes, internal_notes, items_json, status, status_updated_at, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
                """, (
                    orc_number, dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'),
                    dados.get('client_doc'), dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'),
                    dados.get('orc_medicao'), dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'),
                    dados.get('down_payment'), dados.get('subtotal'), dados.get('total_final'), dados.get('notes'),
                    dados.get('internal_notes'), dados.get('items_json'), novo_status, agora
                ))
            else:
                cursor.execute("""
                    INSERT INTO orcamentos (
                        orc_number, obra_name, client_name, client_contact, client_doc, client_phone, client_address,
                        orc_date, orc_medicao, payment_method, pix_key, discount, down_payment, subtotal, total_final,
                        notes, internal_notes, items_json, status, status_updated_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
                """, (
                    orc_number, dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'),
                    dados.get('client_doc'), dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'),
                    dados.get('orc_medicao'), dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'),
                    dados.get('down_payment'), dados.get('subtotal'), dados.get('total_final'), dados.get('notes'),
                    dados.get('internal_notes'), dados.get('items_json'), novo_status, agora
                ))
        conn.commit()
        return jsonify({"status": "success", "message": "Orçamento salvo com sucesso!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/obter/<path:orc_number>', methods=['GET'])
def obter_orcamento(orc_number):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT * FROM orcamentos WHERE orc_number = {p}", (orc_number,))
        row = cursor.fetchone()
        if row:
            return jsonify({"status": "success", "orcamento": dict(row)})
        return jsonify({"status": "error", "message": "Orçamento não encontrado"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/servicos/listar', methods=['GET'])
def listar_servicos():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, area, description, unit, price FROM servicos ORDER BY area ASC, id ASC")
        servicos = [dict(row) for row in cursor.fetchall()]
        return jsonify({"status": "success", "servicos": servicos})
    except Exception as e:
        app.logger.exception("Erro ao listar serviços")
        return jsonify({"status": "error", "message": "Não foi possível listar os serviços."}), 500
    finally:
        conn.close()


@app.route('/api/servicos/salvar', methods=['POST'])
def salvar_servico():
    dados = request.get_json(silent=True) or {}
    area = str(dados.get('area') or '').strip().upper()
    description = str(dados.get('description') or '').strip()
    unit = str(dados.get('unit') or 'm²').strip()

    try:
        price = float(dados.get('price') or 0)
        if price < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Preço inválido."}), 400

    if not area or not description:
        return jsonify({"status": "error", "message": "Área e descrição são obrigatórias."}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        servico_id = dados.get('id')

        if servico_id:
            cursor.execute(
                f"UPDATE servicos SET area={p}, description={p}, unit={p}, price={p} WHERE id={p}",
                (area, description, unit, price, servico_id)
            )
            if cursor.rowcount == 0:
                conn.rollback()
                return jsonify({"status": "error", "message": "Serviço não encontrado."}), 404
        else:
            cursor.execute(
                f"INSERT INTO servicos (area, description, unit, price) VALUES ({p}, {p}, {p}, {p})",
                (area, description, unit, price)
            )

        conn.commit()
        return jsonify({"status": "success", "message": "Serviço salvo com sucesso!"})
    except Exception:
        conn.rollback()
        app.logger.exception("Erro ao salvar serviço")
        return jsonify({"status": "error", "message": "Não foi possível salvar o serviço."}), 500
    finally:
        conn.close()


@app.route('/api/servicos/deletar/<int:servico_id>', methods=['DELETE'])
def deletar_servico(servico_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"DELETE FROM servicos WHERE id = {p}", (servico_id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"status": "error", "message": "Serviço não encontrado."}), 404
        conn.commit()
        return jsonify({"status": "success", "message": "Serviço excluído com sucesso!"})
    except Exception:
        conn.rollback()
        app.logger.exception("Erro ao excluir serviço")
        return jsonify({"status": "error", "message": "Não foi possível excluir o serviço."}), 500
    finally:
        conn.close()

@app.route('/api/atualizar_status', methods=['POST'])
def atualizar_status():
    dados = request.get_json(silent=True) or {}
    orc_number = str(dados.get('orc_number') or '').strip()
    novo_status = str(dados.get('status') or '').strip()
    if not orc_number or novo_status not in {'Enviado', 'Em andamento', 'Aprovado', 'Recusado'}:
        return jsonify({"status": "error", "message": "Orçamento ou status inválido."}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT status FROM orcamentos WHERE orc_number={p}", (orc_number,))
        atual = cursor.fetchone()
        if not atual:
            return jsonify({"status": "error", "message": "Orçamento não encontrado."}), 404
        cursor.execute("SELECT TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') AS agora" if DATABASE_URL else "SELECT datetime('now', 'localtime') AS agora")
        agora = cursor.fetchone()['agora']
        cursor.execute(f"UPDATE orcamentos SET status={p}, status_updated_at={p} WHERE orc_number={p}", (novo_status, agora, orc_number))
        conn.commit()
        return jsonify({"status": "success", "message": "Status atualizado."})
    except Exception:
        conn.rollback()
        app.logger.exception("Erro ao atualizar status")
        return jsonify({"status": "error", "message": "Não foi possível atualizar o status."}), 500
    finally:
        conn.close()


@app.route('/api/financeiro/<path:orc_number>', methods=['GET'])
def obter_financeiro(orc_number):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT orc_number, obra_name, client_name, total_final, down_payment, status FROM orcamentos WHERE orc_number={p}", (orc_number,))
        orc = cursor.fetchone()
        if not orc:
            return jsonify({"status": "error", "message": "Orçamento não encontrado."}), 404
        cursor.execute(f"SELECT id, valor, data_pagamento, metodo, observacao FROM pagamentos WHERE orc_number={p} ORDER BY data_pagamento, id", (orc_number,))
        pagamentos = [dict(r) for r in cursor.fetchall()]
        total = float(orc['total_final'] or 0)
        recebido = sum(float(x['valor'] or 0) for x in pagamentos)
        return jsonify({"status": "success", "orcamento": dict(orc), "pagamentos": pagamentos,
                        "total": total, "recebido": recebido, "saldo": max(0, total-recebido),
                        "percentual": min(100, (recebido/total*100) if total > 0 else 0),
                        "entrada_prevista": total * float(orc['down_payment'] or 0) / 100})
    except Exception:
        app.logger.exception("Erro ao consultar financeiro")
        return jsonify({"status": "error", "message": "Não foi possível carregar o financeiro."}), 500
    finally:
        conn.close()


@app.route('/api/financeiro/<path:orc_number>/pagamentos', methods=['POST'])
def registrar_pagamento(orc_number):
    dados = request.get_json(silent=True) or {}
    try:
        valor = float(dados.get('valor'))
        if valor <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Informe um valor maior que zero."}), 400
    data_pagamento = str(dados.get('data_pagamento') or '').strip()
    if not data_pagamento:
        return jsonify({"status": "error", "message": "Informe a data do recebimento."}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT total_final FROM orcamentos WHERE orc_number={p}", (orc_number,))
        orc = cursor.fetchone()
        if not orc:
            return jsonify({"status": "error", "message": "Orçamento não encontrado."}), 404
        cursor.execute(f"SELECT COALESCE(SUM(valor), 0) AS recebido FROM pagamentos WHERE orc_number={p}", (orc_number,))
        recebido = float(cursor.fetchone()['recebido'] or 0)
        total = float(orc['total_final'] or 0)
        if valor > total - recebido + 0.005:
            return jsonify({"status": "error", "message": "O recebimento ultrapassa o saldo restante."}), 400
        cursor.execute(
            f"INSERT INTO pagamentos (orc_number, valor, data_pagamento, metodo, observacao) VALUES ({p}, {p}, {p}, {p}, {p})",
            (orc_number, valor, data_pagamento, str(dados.get('metodo') or '').strip(), str(dados.get('observacao') or '').strip())
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Recebimento registrado."})
    except Exception:
        conn.rollback()
        app.logger.exception("Erro ao registrar pagamento")
        return jsonify({"status": "error", "message": "Não foi possível registrar o recebimento."}), 500
    finally:
        conn.close()


@app.route('/api/financeiro/<path:orc_number>/pagamentos/<int:pagamento_id>', methods=['PUT'])
def editar_pagamento(orc_number, pagamento_id):
    dados = request.get_json(silent=True) or {}
    try:
        valor = float(dados.get('valor'))
        if valor <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Informe um valor maior que zero."}), 400
    data_pagamento = str(dados.get('data_pagamento') or '').strip()
    if not data_pagamento:
        return jsonify({"status": "error", "message": "Informe a data do recebimento."}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT total_final FROM orcamentos WHERE orc_number={p} AND deleted_at IS NULL", (orc_number,))
        orc = cursor.fetchone()
        if not orc:
            return jsonify({"status":"error", "message":"Orçamento não encontrado."}), 404
        cursor.execute(f"SELECT id FROM pagamentos WHERE id={p} AND orc_number={p}", (pagamento_id, orc_number))
        if not cursor.fetchone():
            return jsonify({"status":"error", "message":"Recebimento não encontrado."}), 404
        cursor.execute(f"SELECT COALESCE(SUM(valor),0) AS recebido FROM pagamentos WHERE orc_number={p} AND id<>{p}", (orc_number, pagamento_id))
        outros = float(cursor.fetchone()['recebido'] or 0)
        if valor > float(orc['total_final'] or 0) - outros + 0.005:
            return jsonify({"status":"error", "message":"O valor informado ultrapassa o saldo disponível considerando os demais recebimentos."}), 400
        cursor.execute(f"UPDATE pagamentos SET valor={p}, data_pagamento={p}, metodo={p}, observacao={p} WHERE id={p} AND orc_number={p}",
            (valor, data_pagamento, str(dados.get('metodo') or '').strip(), str(dados.get('observacao') or '').strip(), pagamento_id, orc_number))
        conn.commit()
        return jsonify({"status":"success", "message":"Recebimento atualizado."})
    except Exception:
        conn.rollback()
        app.logger.exception("Erro ao editar recebimento")
        return jsonify({"status":"error", "message":"Não foi possível editar o recebimento."}), 500
    finally:
        conn.close()


@app.route('/api/deletar/<path:orc_number>', methods=['DELETE'])
def deletar_orcamento(orc_number):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT orc_number, client_name, obra_name, total_final FROM orcamentos WHERE orc_number={p} AND deleted_at IS NULL", (orc_number,))
        orc = cursor.fetchone()
        if not orc:
            return jsonify({"status": "error", "message": "Orçamento não encontrado ou já excluído."}), 404
        agora_sql = "TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')" if DATABASE_URL else "datetime('now', 'localtime')"
        if DATABASE_URL:
            cursor.execute("UPDATE orcamentos SET deleted_at=NOW()::text WHERE orc_number=%s", (orc_number,))
        else:
            cursor.execute("UPDATE orcamentos SET deleted_at=datetime('now','localtime') WHERE orc_number=?", (orc_number,))
        cursor.execute(
            f"INSERT INTO atividades_auditoria (tipo, orc_number, descricao, cliente, obra, valor) VALUES ({p}, {p}, {p}, {p}, {p}, {p})",
            ('exclusao', orc_number, 'Orçamento excluído (remoção lógica)', orc['client_name'], orc['obra_name'], float(orc['total_final'] or 0))
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Orçamento excluído. O histórico e os recebimentos foram preservados."})
    except Exception as e:
        conn.rollback()
        app.logger.exception("Erro ao excluir orçamento")
        return jsonify({"status": "error", "message": "Não foi possível excluir o orçamento."}), 500
    finally:
        conn.close()

@app.route('/api/dashboard/financeiro', methods=['GET'])
def dashboard_financeiro():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""SELECT o.orc_number, o.total_final, COALESCE(SUM(p.valor),0) AS recebido
            FROM orcamentos o LEFT JOIN pagamentos p ON p.orc_number=o.orc_number
            WHERE o.deleted_at IS NULL AND o.status IN ('Aprovado','Em andamento')
            GROUP BY o.orc_number, o.total_final""")
        rows = [dict(r) for r in cursor.fetchall()]
        total_recebido = sum(float(r['recebido'] or 0) for r in rows)
        total_a_receber = sum(max(0, float(r['total_final'] or 0)-float(r['recebido'] or 0)) for r in rows)
        parcial = sum(1 for r in rows if float(r['recebido'] or 0) > 0 and float(r['recebido'] or 0) < float(r['total_final'] or 0)-0.005)
        quitados = sum(1 for r in rows if float(r['total_final'] or 0) > 0 and float(r['recebido'] or 0) >= float(r['total_final'] or 0)-0.005)
        cursor.execute("""SELECT substr(p.data_pagamento,1,7) AS mes, SUM(p.valor) AS total
            FROM pagamentos p JOIN orcamentos o ON o.orc_number=p.orc_number
            WHERE o.deleted_at IS NULL AND o.status IN ('Aprovado','Em andamento') GROUP BY substr(p.data_pagamento,1,7) ORDER BY mes DESC LIMIT 12""")
        meses = [dict(r) for r in cursor.fetchall()][::-1]
        return jsonify({"status":"success", "total_recebido":total_recebido, "total_a_receber":total_a_receber,
            "parcialmente_pagos":parcial, "quitados":quitados, "recebimentos_mensais":meses})
    except Exception:
        app.logger.exception("Erro no resumo financeiro")
        return jsonify({"status":"error", "message":"Não foi possível carregar o resumo financeiro."}), 500
    finally:
        conn.close()

@app.route('/api/atividades/auditoria', methods=['GET'])
def listar_atividades_auditoria():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, tipo, orc_number, descricao, cliente, obra, valor, detalhes, criado_em FROM atividades_auditoria ORDER BY id DESC LIMIT 200")
        return jsonify([dict(r) for r in cursor.fetchall()])
    except Exception:
        app.logger.exception("Erro ao listar auditoria")
        return jsonify([]), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)