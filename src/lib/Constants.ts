import useWindowDimensions from "./useWindowDimensions";

export const Colors = {
    background: '#17171E',
    text: '#FFF',
    primaryLight: '#FCC679',
    primaryRegular: '#FA9D17',
    primaryDark: '#df8605',
    secondaryLight: '#e293ae',
    secondaryRegular: '#F2729F', //#ff76a6
    secondaryDark: '#CA3C6D', //CA3C6D, ae2f5b
    tertiaryLight: '#b5aff7',
    tertiaryRegular: '#9991F4',
    tertiaryDark: '#6E63EF',
    green: "#28a850",
    darkerGreen: "#20a85a",
    red: "#e64640",
}

export const radius = 10;
export const padding = 12;

export const useFdim = () => {
    const window = useWindowDimensions();
    const fdim = window.height && window.width ? Math.min(window.height * 0.9, window.width) : 1000;
    return fdim;
}
