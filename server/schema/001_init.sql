-- ============================================================================
-- Schema: Contagem Cíclica — Azure SQL Server (T-SQL)
-- Reexecutável: usa IF NOT EXISTS / guards em todas as instruções.
-- Preserva UUIDs: todas as PKs são UNIQUEIDENTIFIER com DEFAULT NEWID()
-- ou recebem o UUID explicitamente na migração (endpoint /api/migrate).
-- ============================================================================

-- count_bases ----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'count_bases')
BEGIN
  CREATE TABLE count_bases (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    name        NVARCHAR(255)    NOT NULL,
    created_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_count_bases PRIMARY KEY (id),
    CONSTRAINT uq_count_bases_name UNIQUE (name)
  );
END

-- count_items ----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'count_items')
BEGIN
  CREATE TABLE count_items (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    base_id         UNIQUEIDENTIFIER NOT NULL,
    sku             NVARCHAR(255)    NOT NULL,
    description     NVARCHAR(500)    NOT NULL DEFAULT '',
    location        NVARCHAR(255)    NOT NULL DEFAULT '',
    system_qty      DECIMAL(18,4)    NOT NULL DEFAULT 0,
    abc_class       NVARCHAR(1)      NULL,
    frequency       NVARCHAR(50)     NULL,
    last_counted_at DATE             NULL,
    created_at      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_count_items PRIMARY KEY (id),
    CONSTRAINT fk_count_items_base FOREIGN KEY (base_id) REFERENCES count_bases(id) ON DELETE CASCADE,
    CONSTRAINT uq_count_items_base_sku UNIQUE (base_id, sku),
    CONSTRAINT ck_count_items_abc CHECK (abc_class IS NULL OR abc_class IN ('A','B','C'))
  );
END

-- count_plans ----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'count_plans')
BEGIN
  CREATE TABLE count_plans (
    id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    base_id       UNIQUEIDENTIFIER NOT NULL,
    item_id       UNIQUEIDENTIFIER NULL,
    scheduled_date DATE            NOT NULL,
    status        NVARCHAR(20)     NOT NULL DEFAULT 'pending',
    completed_at  DATETIME2        NULL,
    operator_name NVARCHAR(255)    NOT NULL DEFAULT '',
    created_at    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_count_plans PRIMARY KEY (id),
    CONSTRAINT fk_count_plans_base FOREIGN KEY (base_id) REFERENCES count_bases(id) ON DELETE CASCADE,
    CONSTRAINT fk_count_plans_item FOREIGN KEY (item_id) REFERENCES count_items(id) ON DELETE SET NULL,
    CONSTRAINT ck_count_plans_status CHECK (status IN ('pending','completed'))
  );
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_count_plans_date')
  CREATE INDEX ix_count_plans_date ON count_plans (scheduled_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_count_plans_item')
  CREATE INDEX ix_count_plans_item ON count_plans (item_id);

-- count_results --------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'count_results')
BEGIN
  CREATE TABLE count_results (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    plan_id     UNIQUEIDENTIFIER NOT NULL,
    item_id     UNIQUEIDENTIFIER NOT NULL,
    system_qty  DECIMAL(18,4)    NOT NULL DEFAULT 0,
    counted_qty DECIMAL(18,4)    NOT NULL,
    counted_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    qad_qty     DECIMAL(18,4)    NULL,
    adjustment  NVARCHAR(3)      NULL,
    observation NVARCHAR(2000)   NULL,
    CONSTRAINT pk_count_results PRIMARY KEY (id),
    CONSTRAINT fk_count_results_plan FOREIGN KEY (plan_id) REFERENCES count_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_count_results_item FOREIGN KEY (item_id) REFERENCES count_items(id) ON DELETE CASCADE,
    CONSTRAINT uq_count_results_plan_item UNIQUE (plan_id, item_id),
    CONSTRAINT ck_count_results_adj CHECK (adjustment IS NULL OR adjustment IN ('OK','NOK'))
  );
END

-- count_history --------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'count_history')
BEGIN
  CREATE TABLE count_history (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    source_line INT              NOT NULL,
    count_date  DATE             NULL,
    pn          NVARCHAR(255)    NOT NULL DEFAULT '',
    description NVARCHAR(500)    NOT NULL DEFAULT '',
    abc         NVARCHAR(1)      NULL,
    system_mom  DECIMAL(18,4)    NULL,
    system_qad  DECIMAL(18,4)    NULL,
    counted_qty DECIMAL(18,4)    NULL,
    variance_qad DECIMAL(18,4)   NULL,
    variance_jfk DECIMAL(18,4)   NULL,
    adjustment  NVARCHAR(3)      NULL,
    status_note NVARCHAR(2000)   NULL,
    created_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_count_history PRIMARY KEY (id),
    CONSTRAINT uq_count_history_line UNIQUE (source_line)
  );
END

-- item_costs -----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'item_costs')
BEGIN
  CREATE TABLE item_costs (
    pn             NVARCHAR(255)    NOT NULL,
    description    NVARCHAR(500)    NOT NULL,
    supplier       NVARCHAR(255)    NULL,
    abc            NVARCHAR(1)      NULL,
    unit_cost_usd  DECIMAL(12,4)    NOT NULL,
    created_at     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_item_costs PRIMARY KEY (pn),
    CONSTRAINT ck_item_costs_abc CHECK (abc IS NULL OR abc IN ('A','B','C'))
  );
END

-- position_checks ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'position_checks')
BEGIN
  CREATE TABLE position_checks (
    id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    count_item_id    UNIQUEIDENTIFIER NULL,
    check_date       DATE             NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    operator_name    NVARCHAR(255)    NOT NULL,
    locations_checked INT             NOT NULL,
    locations_ok     INT              NOT NULL,
    locations_not_ok INT              NOT NULL,
    occurrence       NVARCHAR(2000)   NULL,
    action_plan      NVARCHAR(2000)   NULL,
    created_at       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_position_checks PRIMARY KEY (id),
    CONSTRAINT fk_position_checks_item FOREIGN KEY (count_item_id) REFERENCES count_items(id) ON DELETE SET NULL,
    CONSTRAINT ck_pos_checked CHECK (locations_checked > 0),
    CONSTRAINT ck_pos_ok CHECK (locations_ok >= 0),
    CONSTRAINT ck_pos_notok CHECK (locations_not_ok >= 0),
    CONSTRAINT ck_pos_sum CHECK (locations_ok + locations_not_ok = locations_checked),
    CONSTRAINT ck_pos_action CHECK (locations_not_ok = 0 OR LEN(LTRIM(ISNULL(action_plan,''))) > 0)
  );
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_position_checks_item')
  CREATE INDEX ix_position_checks_item ON position_checks (count_item_id);
