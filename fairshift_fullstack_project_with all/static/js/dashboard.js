// FAIRSHIFT Full-Featured Dashboard Controller
let currentData = {
    metrics: {},
    programs: [],
    assignments: []
};

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initAuthHeader();
    await loadCurrentData();
    setupEventListeners();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`section-${sectionId}`);
            if (targetSection) targetSection.classList.add('active');

            pageTitle.textContent = item.textContent.trim();
        });
    });
}

function initAuthHeader() {
    const localUser = JSON.parse(localStorage.getItem('fairshift_user') || 'null');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const userAvatarEl = document.querySelector('.user-avatar');

    if (localUser) {
        if (userNameEl) userNameEl.textContent = localUser.name || 'Admin';
        if (userRoleEl) userRoleEl.textContent = localUser.role || 'Allocator';
        if (userAvatarEl && localUser.name) userAvatarEl.textContent = localUser.name[0].toUpperCase();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e){}
            localStorage.removeItem('fairshift_user');
            window.location.href = 'login.html';
        });
    }
}

async function loadCurrentData() {
    showToast('Syncing with database...');
    try {
        const res = await fetch('/api/allocation/current');
        const data = await res.json();
        if (data.success) {
            currentData = data;
            renderOverview(data);
            renderAllocationTable(data.assignments);
            renderReassignSelects(data);
            renderAppealSelects(data);
            renderDataTables(data);
            await loadAuditLogs();
            showToast('Allocation data synchronized');
        }
    } catch (err) {
        console.error('Error fetching data from API:', err);
    }
}

function renderOverview(data) {
    const m = data.metrics;
    document.getElementById('m-applicants').textContent = m.applicants;
    document.getElementById('m-programs').textContent = m.programs;
    document.getElementById('m-assigned').textContent = m.assigned;
    document.getElementById('m-pref').textContent = `${m.pref_satisfaction}%`;
    document.getElementById('m-reassign').textContent = m.reassignments || 0;
    document.getElementById('m-status').textContent = m.solver_status;

    // Fill rates
    const fillContainer = document.getElementById('fillRates');
    fillContainer.innerHTML = '';
    data.programs.forEach(p => {
        const pct = Math.min(100, Math.round((p.assigned / p.capacity) * 100));
        const div = document.createElement('div');
        div.className = 'fill-bar-row';
        div.innerHTML = `
            <div class="fill-bar-label">
                <span><strong>${p.id}</strong> — ${p.name}</span>
                <span>${p.assigned} / ${p.capacity} (${pct}%)</span>
            </div>
            <div class="fill-bar-track">
                <div class="fill-bar-val" style="width: ${pct}%"></div>
            </div>
        `;
        fillContainer.appendChild(div);
    });

    // Preference Bars
    const prefContainer = document.getElementById('prefBars');
    prefContainer.innerHTML = '';
    const totalAssigned = m.assigned || 1;
    for (let i = 1; i <= 5; i++) {
        const count = data.rank_counts[i] || 0;
        const pct = Math.round((count / totalAssigned) * 100);
        const row = document.createElement('div');
        row.className = 'pref-row';
        row.innerHTML = `
            <span class="pref-rank">Choice #${i}</span>
            <div class="pref-bar-track">
                <div class="pref-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="pref-count">${count} (${pct}%)</span>
        `;
        prefContainer.appendChild(row);
    }
}

function renderAllocationTable(assignments) {
    const tbody = document.querySelector('#allocTable tbody');
    tbody.innerHTML = '';
    const searchVal = document.getElementById('allocSearch').value.toLowerCase();

    assignments
        .filter(a => a.name.toLowerCase().includes(searchVal) || a.applicant_id.toLowerCase().includes(searchVal) || a.program_name.toLowerCase().includes(searchVal))
        .forEach(a => {
            const tr = document.createElement('tr');
            let badgeClass = 'badge-assigned';
            if (a.status === 'Withdrawn') badgeClass = 'badge-withdrawn';
            if (a.status === 'Unassigned') badgeClass = 'badge-unassigned';

            tr.innerHTML = `
                <td><strong>${a.applicant_id}</strong> <span style="color:var(--text-muted)">(${a.name})</span></td>
                <td>${a.program_id !== '—' ? `<strong>${a.program_id}</strong> — ${a.program_name}` : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                <td>${a.preference_rank !== '—' ? `Rank #${a.preference_rank}` : '—'}</td>
                <td><small style="color:var(--text-muted)">${a.eligible_programs.join(', ')}</small></td>
                <td><span class="badge-tag ${badgeClass}">${a.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
}

function renderReassignSelects(data) {
    const progSel = document.getElementById('changeProgram');
    const appSel = document.getElementById('withdrawApplicant');

    progSel.innerHTML = '';
    data.programs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.id} — ${p.name} (Current: ${p.capacity})`;
        progSel.appendChild(opt);
    });

    appSel.innerHTML = '';
    data.assignments
        .filter(a => a.status === 'Assigned')
        .slice(0, 50)
        .forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.applicant_id;
            opt.textContent = `${a.applicant_id} — ${a.name} (${a.program_id})`;
            appSel.appendChild(opt);
        });
}

function renderAppealSelects(data) {
    const appSel = document.getElementById('appealApplicant');
    const progSel = document.getElementById('appealProgram');

    appSel.innerHTML = '';
    data.assignments
        .filter(a => a.status !== 'Withdrawn')
        .forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.applicant_id;
            opt.textContent = `${a.applicant_id} — ${a.name} (Current: ${a.program_id})`;
            appSel.appendChild(opt);
        });

    progSel.innerHTML = '';
    data.programs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.id} — ${p.name}`;
        progSel.appendChild(opt);
    });
}

function renderDataTables(data) {
    // Programs Table
    const pTbody = document.querySelector('#programsTable tbody');
    pTbody.innerHTML = '';
    data.programs.forEach(p => {
        const tr = document.createElement('tr');
        const rem = p.capacity - p.assigned;
        tr.innerHTML = `
            <td><strong>${p.id}</strong> — ${p.name}</td>
            <td>${p.capacity}</td>
            <td>${p.assigned}</td>
            <td style="color:${rem < 0 ? 'var(--danger)' : 'var(--text-muted)'}">${rem}</td>
        `;
        pTbody.appendChild(tr);
    });

    // Applicants Table
    const aTbody = document.querySelector('#applicantsTable tbody');
    aTbody.innerHTML = '';
    data.assignments.slice(0, 20).forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${a.applicant_id}</strong></td>
            <td>${a.name}</td>
            <td>${a.preferences.length > 0 ? a.preferences[0] : 'None'}</td>
            <td><small style="color:var(--text-muted)">${a.eligible_programs.join(', ')}</small></td>
        `;
        aTbody.appendChild(tr);
    });
}

async function loadAuditLogs() {
    try {
        const res = await fetch('/api/audit/logs');
        const data = await res.json();
        const tbody = document.querySelector('#auditTable tbody');
        tbody.innerHTML = '';
        data.logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${l.timestamp}</small></td>
                <td><strong>${l.action}</strong></td>
                <td>${l.details}</td>
                <td><span class="badge-tag badge-assigned">${l.solver_status}</span></td>
                <td>${l.user_name}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {}
}

function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', loadCurrentData);

    document.getElementById('runInitialBtn').addEventListener('click', async () => {
        showToast('Running CP-SAT allocation algorithm...');
        try {
            const res = await fetch('/api/allocation/initial', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                await loadCurrentData();
                showToast('Initial allocation optimized successfully!');
            }
        } catch(e) {}
    });

    document.getElementById('exportAllocBtn').addEventListener('click', () => {
        window.location.href = '/api/data/export';
    });

    document.getElementById('allocSearch').addEventListener('input', () => {
        renderAllocationTable(currentData.assignments);
    });

    // Reassignment action toggle
    const changeTypeSel = document.getElementById('changeType');
    changeTypeSel.addEventListener('change', () => {
        const isCap = changeTypeSel.value === 'capacity';
        document.getElementById('programSelectGroup').hidden = !isCap;
        document.getElementById('capacityGroup').hidden = !isCap;
        document.getElementById('applicantSelectGroup').hidden = isCap;
    });

    document.getElementById('runReassignBtn').addEventListener('click', async () => {
        const changeType = changeTypeSel.value;
        const payload = {
            change_type: changeType,
            program_id: document.getElementById('changeProgram').value,
            new_capacity: document.getElementById('newCapacity').value,
            applicant_id: document.getElementById('withdrawApplicant').value
        };

        showToast('Recomputing with minimal disruption penalty...');
        try {
            const res = await fetch('/api/allocation/reassign', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('reassignResult').hidden = false;
                document.getElementById('r-changed').textContent = data.changed_count;
                document.getElementById('r-preserved').textContent = data.preserved_count;
                document.getElementById('r-pref').textContent = `${data.new_pref_satisfaction}%`;
                document.getElementById('r-status').textContent = data.status;

                const tbody = document.querySelector('#changeTable tbody');
                tbody.innerHTML = '';
                if (data.changes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">Zero placements disturbed. Allocation fully stable.</td></tr>';
                } else {
                    data.changes.forEach(c => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${c.applicant_id}</strong></td>
                            <td>${c.from_program}</td>
                            <td><strong>${c.to_program}</strong></td>
                            <td><small>${c.reason}</small></td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
                await loadCurrentData();
                showToast('Reassignment recomputed with minimal disruption!');
            }
        } catch(e) {}
    });

    // Appeal button
    document.getElementById('runAppealBtn').addEventListener('click', async () => {
        const payload = {
            applicant_id: document.getElementById('appealApplicant').value,
            program_id: document.getElementById('appealProgram').value
        };

        showToast('Running counterfactual appeal analysis...');
        try {
            const res = await fetch('/api/allocation/appeal', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                const resPanel = document.getElementById('appealResult');
                resPanel.hidden = false;
                const verd = document.getElementById('appealVerdict');
                verd.className = `appeal-verdict ${data.feasible ? 'approved' : 'rejected'}`;
                verd.textContent = `Verdict: ${data.verdict}`;

                document.getElementById('a-affected').textContent = data.affected_count;
                document.getElementById('a-delta').textContent = data.delta_pref;
                document.getElementById('a-extra').textContent = data.extra_reassignments;
                document.getElementById('a-feas').textContent = data.feasible ? 'FEASIBLE' : 'INFEASIBLE';

                const tbody = document.querySelector('#impactTable tbody');
                tbody.innerHTML = '';
                if (data.impacted.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No other applicants impacted by this placement.</td></tr>';
                } else {
                    data.impacted.forEach(i => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${i.applicant_id}</strong></td>
                            <td>${i.original}</td>
                            <td><strong>${i.after_appeal}</strong></td>
                            <td>${i.pref_change}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }

                document.getElementById('appealExplanation').textContent = data.explanation;
                await loadAuditLogs();
                showToast('Counterfactual evaluation completed.');
            }
        } catch(e) {}
    });

    // Validation button
    document.getElementById('runValidateBtn').addEventListener('click', async () => {
        showToast('Running independent formal verification...');
        try {
            const res = await fetch('/api/validation/run', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const report = document.getElementById('validationReport');
                report.innerHTML = '';
                data.checks.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'validation-item';
                    div.innerHTML = `
                        <div class="val-icon">${c.passed ? '✅' : '❌'}</div>
                        <div class="val-content">
                            <h4>${c.name} — <span style="color:${c.passed ? 'var(--success)' : 'var(--danger)'}">${c.passed ? 'PASSED' : 'FAILED'}</span></h4>
                            <p>${c.details}</p>
                        </div>
                    `;
                    report.appendChild(div);
                });
                await loadAuditLogs();
                showToast('Independent constraint check complete!');
            }
        } catch(e) {}
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3200);
}
