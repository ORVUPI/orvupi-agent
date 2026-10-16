# Comprender la curva

## Español

En estas fichas, la curva de Pump.fun es una cuenta derivada. Si el propietario es el programa de la curva, Verify lee campos públicos: cantidades virtuales y reales de la curva, suministro de esa cuenta y si `complete` es verdadero o falso.

La cantidad virtual de la curva no es la cantidad real. No se suman como si fueran una única cantidad retirable. La ficha las muestra por separado.

El avance de la curva clásica es un cálculo inferido: parte de la cantidad real inicial documentada de la curva, `793100000000000`, y trunca a dos decimales hacia cero. No es un campo guardado en la cuenta. Si la cantidad real leída coincide con esa inicial, la resta es cero y el avance sale `0.00` inferido: la cuenta sí se leyó. Cero inferido no es un dato ausente. Las fichas del 2026-10-16 (USDC, USDT y tres copias) no son curvas de Pump.fun: ahí el avance queda en «no aplica».

USDC no tiene curva en la dirección derivada. La ficha lo deja en «no es una curva» y el avance queda en no aplica. No rellena con cero las cantidades de la curva.

La muestra de cuentas con tokens de las cinco fichas está en no disponible por HTTP 429. No es concentración cero y no dice quién es una persona. Una cuenta puede ser un custodio. La dirección `creator` de la curva tampoco identifica a una persona: es un campo de la cuenta.

La capitalización no es la liquidez de la curva. Esta misión no calcula capitalización, comisiones ni un intercambio. Un número de avance no es una instrucción.

## English

On these cards, the Pump.fun curve is a derived account. If the owner is the curve program, Verify reads public fields: virtual and real curve amounts, the supply on that account, and whether `complete` is true or false.

The virtual curve amount is not the real curve amount. They are not added together as one withdrawable pool. The card shows them separately.

Classic curve progress is an inferred calculation: it starts from the documented initial real curve amount, `793100000000000`, and truncates toward zero to two decimals. It is not a field stored on the account. If the real amount read matches that initial value, the subtraction is zero and progress comes out as inferred `0.00`: the account was read. An inferred zero is not a missing fact. The 2026-10-16 cards (USDC, USDT, and three copies) are not Pump.fun curves: there, progress stays “not applicable”.

USDC has no curve at the derived address. The card records “not a curve” and progress stays not applicable. It does not fill the curve amounts with zero.

The token account sample on all five cards is unavailable because of HTTP 429. It is not zero concentration and it does not say who a person is. An account can be a custodian. The curve `creator` address does not identify a person either: it is a field of the account.

Market cap is not the curve’s liquidity. This mission does not calculate market cap, fees, or a swap. A progress figure is not an instruction.
