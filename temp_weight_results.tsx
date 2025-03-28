{currentOperation.formData.animalsPerKg && (
  <Card className="shadow-sm overflow-hidden">
    <CardHeader className="pb-2 bg-blue-50">
      <CardTitle className="text-base font-medium">Nuovi valori calcolati</CardTitle>
      <CardDescription>
        Valori ricalcolati in base al nuovo peso totale, mantenendo lo stesso numero di animali
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
          <p className="text-xs text-gray-500 mb-1">Nuovo animali per kg</p>
          <p className="font-bold text-lg text-slate-900">
            {currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}
          </p>
          {previousOperationData?.animalsPerKg && (
            <div className="text-xs text-green-600 flex items-center mt-1">
              {currentOperation.formData.animalsPerKg < previousOperationData.animalsPerKg ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" /> 
                  <span>-{(previousOperationData.animalsPerKg - currentOperation.formData.animalsPerKg).toLocaleString('it-IT')}</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" /> 
                  <span>+{(currentOperation.formData.animalsPerKg - previousOperationData.animalsPerKg).toLocaleString('it-IT')}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
          <p className="text-xs text-gray-500 mb-1">Nuovo peso medio (mg)</p>
          <p className="font-bold text-lg text-slate-900">
            {currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'}
          </p>
          {previousOperationData?.averageWeight && (
            <div className="text-xs text-green-600 flex items-center mt-1">
              {currentOperation.formData.averageWeight > previousOperationData.averageWeight ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" /> 
                  <span>+{(currentOperation.formData.averageWeight - previousOperationData.averageWeight).toLocaleString('it-IT')}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" /> 
                  <span>-{(previousOperationData.averageWeight - currentOperation.formData.averageWeight).toLocaleString('it-IT')}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
          <p className="text-xs text-gray-500 mb-1">Numero totale animali</p>
          <p className="font-bold text-lg text-slate-900">
            {currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}
          </p>
          <p className="text-xs text-blue-600 mt-1">Mantenuto dalla misurazione precedente</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}