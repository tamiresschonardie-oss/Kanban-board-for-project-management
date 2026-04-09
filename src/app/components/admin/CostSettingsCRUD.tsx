import { useEffect, useState } from 'react';
import { Calculator, Save } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export function CostSettingsCRUD() {
  const { costSettings, updateCostSettings } = useAdmin();
  const [defaultInternalHourRate, setDefaultInternalHourRate] = useState(
    String(costSettings.defaultInternalHourRate)
  );
  const [defaultExternalHourRate, setDefaultExternalHourRate] = useState(
    String(costSettings.defaultExternalHourRate)
  );
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDefaultInternalHourRate(String(costSettings.defaultInternalHourRate));
    setDefaultExternalHourRate(String(costSettings.defaultExternalHourRate));
  }, [costSettings]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    updateCostSettings({
      defaultInternalHourRate: Number(defaultInternalHourRate) || 0,
      defaultExternalHourRate: Number(defaultExternalHourRate) || 0,
    });

    setNotice('Configurações de custo salvas com sucesso.');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        As regras abaixo alimentam automaticamente o relatório financeiro dos projetos. O cálculo real por colaborador continua priorizando `custo/hora` do usuário e, na ausência dele, usa `salário mensal / 160`.
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3">
            <Calculator className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Parâmetros Financeiros</h2>
            <p className="text-sm text-gray-600">
              Base global para comparativo interno e terceirizado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor padrão interno por hora
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={defaultInternalHourRate}
              onChange={(event) => setDefaultInternalHourRate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor terceirizado por hora
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={defaultExternalHourRate}
              onChange={(event) => setDefaultExternalHourRate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            Última atualização: {new Date(costSettings.updatedAt).toLocaleString('pt-BR')}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            Salvar configurações
          </button>
        </div>

        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
      </form>
    </div>
  );
}
