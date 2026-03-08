import os

filepath = 'c:/myprograms/react_loan_management/backend/loanRoutes.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    if monthly_rate == 0:
        emi = loan_amount / tenure
    else:
        emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** tenure) / (
            (1 + monthly_rate) ** tenure - 1
        )"""

replacement = """    if monthly_rate == 0:
        emi = loan_amount / tenure
    else:
        try:
            if tenure > 1200:
                from flask import jsonify
                return jsonify({"error": "Tenure exceeds maximum allowable value (1200 months)."}), 400
            if interest_rate > 100:
                from flask import jsonify
                return jsonify({"error": "Interest rate cannot exceed 100%."}), 400
            emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** tenure) / (
                (1 + monthly_rate) ** tenure - 1
            )
        except OverflowError:
            from flask import jsonify
            return jsonify({"error": "Interest calculation resulted in a math overflow. Please verify tenure and interest rate inputs."}), 400"""

new_content = content.replace(target, replacement)
if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patched successfully")
else:
    print("Could not find target string to patch.")
