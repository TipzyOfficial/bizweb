/**
 * 
 * @param time takes 2 elements, [0] is hour and [1] is minute.
 * @returns string rep of the time.
 */
export const parseTime = (time: string[]): string => {
    if(parseInt(time[0]) > 12){
        return `${parseInt(time[0])-12}:${time[1]} PM`
    } 
    else {
        if(parseInt(time[0]) === 12) return `12:${time[1]} PM`
        if(parseInt(time[0]) === 0) return `12:${time[1]} AM`
        return `${parseInt(time[0])}:${time[1]} AM`
    }
}

export const dateTimeParserString = (dt: [string[], string]) => {
    return dt[0][0] + " " + dt[0][1] + ", " + dt[0][2] + " @" + dt[1]; 
}

export const dateTimeParser = (str: string): [string[], string] => {
    //mo, day
    const parseDate = (date: string[]) : string[] => {
        const mo = date[1];
        const day = date[2];
        const months = [
            "???",
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ]
        return [months[parseInt(mo)], day, date[0]]
    }

    try {
        const dt = str.split("T");
        const date = dt[0].split("-");
        const time = dt[1].split(":");
        return [parseDate(date), parseTime(time)];
    } 
    catch {
        return([["???","?"], "invalid time"])
    }
}