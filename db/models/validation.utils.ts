export const validateDate = (value: string) => {
    if (!value) {
        return false;
    }

    const [day, month, year] = value.split('-');

    const d = new Date(`${year}-${month}-${day}`);

    if (
        d &&
        d.getMonth() + 1 === Number(month) &&
        d.getDate() === Number(day) &&
        d.getFullYear() === Number(year)
    ) {
        return true;
    }

    return false;
};
